from fastapi import APIRouter, HTTPException, Depends
from google.genai import types

from app.config import settings
from app.services.llm.gemini import client, CHAT_MODEL
from app.services.llm.prompts import build_chat_prompt, SYSTEM_PERSONA
from app.services.memory.conversation import get_session, get_history, append_turn
from app.services.memory.retrieval import retrieve_relevant_memories, format_memory_context
from app.services.memory.long_term import extract_explicit_memory, save_memory
from app.services.rag.retriever import retrieve_chunks_for_user
from app.services.tools.registry import get_tool_declarations, execute_tool
from app.services.safety import policy
from app.services.safety.moderation import DEFAULT_SAFETY_SETTINGS
from app.utils.exceptions import PolicyViolation, ToolExecutionError
from app.dependencies import get_current_user
from app.schemas.chat import ChatRequest, ChatResponse, ChatSource

router = APIRouter(prefix="/chat", tags=["Chat"])

MODEL_NAME = CHAT_MODEL


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, user=Depends(get_current_user)):
    # Verify the session belongs to this user
    if not get_session(user["user_id"], req.session_id):
        raise HTTPException(status_code=404, detail="Chat session not found")

    # --- Safety: block unsafe inputs before hitting the LLM ---
    try:
        policy.check_input(req.message)
    except PolicyViolation as e:
        raise HTTPException(status_code=400, detail=str(e))

    # --- Long-term memory: explicit "remember that ..." triggers ---
    explicit_memory = extract_explicit_memory(req.message)
    if explicit_memory:
        save_memory(user["user_id"], explicit_memory)

    # --- Retrieve relevant long-term memories ---
    memory_context = None
    if req.use_memory:
        memories = retrieve_relevant_memories(user["user_id"], req.message)
        memory_context = format_memory_context(memories)

    # --- RAG: retrieve grounding chunks from user's documents ---
    doc_chunks: list[dict] = []
    document_context = None
    if req.use_documents:
        doc_chunks = [
            c
            for c in retrieve_chunks_for_user(user["user_id"], req.message)
            if c.get("similarity", 0) >= settings.DOC_GROUNDING_MIN_SIMILARITY
        ]
        if doc_chunks:
            document_context = "\n\n---\n\n".join(c["content"] for c in doc_chunks)

    # --- Build conversation history for Gemini ---
    history = get_history(req.session_id)
    contents: list[types.Content] = []

    # System persona as opening exchange so it persists across turns
    contents.append(
        types.Content(role="user", parts=[types.Part.from_text(text=f"[SYSTEM]: {SYSTEM_PERSONA}")])
    )
    contents.append(
        types.Content(role="model", parts=[types.Part.from_text(text="Understood. I'm NetBot, ready to help.")])
    )

    for msg in history:
        role = msg["role"] if msg["role"] in ("user", "model") else "model"
        contents.append(
            types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])])
        )

    prompt = build_chat_prompt(req.message, memory_context, document_context)
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))

    tools = get_tool_declarations() if req.use_tools else None
    tools_used: list[str] = []

    try:
        generate_config = types.GenerateContentConfig(
            safety_settings=DEFAULT_SAFETY_SETTINGS,
            **({"tools": tools} if tools else {}),
        )
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=generate_config,
        )

        # --- Function-calling loop ---
        rounds = 0
        while response.candidates and response.candidates[0].content.parts:
            function_calls = [
                part.function_call
                for part in response.candidates[0].content.parts
                if getattr(part, "function_call", None)
            ]
            if not function_calls or rounds >= settings.MAX_TOOL_ROUNDS:
                break

            contents.append(response.candidates[0].content)
            function_response_parts = []
            for call in function_calls:
                tools_used.append(call.name)
                try:
                    result = execute_tool(call.name, dict(call.args))
                except ToolExecutionError as e:
                    result = {"error": str(e)}
                function_response_parts.append(
                    types.Part.from_function_response(name=call.name, response={"result": result})
                )
            contents.append(types.Content(role="user", parts=function_response_parts))

            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
                config=generate_config,
            )
            rounds += 1

        # --- Safety: block unsafe outputs ---
        policy.check_output(response)
        reply_text = response.text or ""

    except PolicyViolation as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")

    append_turn(req.session_id, user["user_id"], req.message, reply_text)

    sources = [
        ChatSource(document_id=c["document_id"], chunk_index=c["chunk_index"], similarity=c["similarity"])
        for c in doc_chunks
    ]
    return ChatResponse(response=reply_text, tools_used=tools_used, sources=sources)
