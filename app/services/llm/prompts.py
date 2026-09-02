SYSTEM_PERSONA = (
    "You are NetBot, a helpful, knowledgeable, and concise assistant. "
    "Be direct and clear. When you use a tool, briefly mention what you used it for. "
    "When you answer from the user's documents, say so. "
    "Do not make up information that isn't in your context or the user's documents."
)

RAG_ANSWER_PROMPT = (
    "Answer the question using ONLY the context below. "
    "If the answer isn't in the context, say you don't know.\n\n"
    "Context:\n{context}\n\nQuestion: {question}"
)

MEMORY_CONTEXT_PREFIX = (
    "Relevant facts you remember about this user from earlier conversations "
    "(use only if relevant, don't force them into the reply):\n{memories}\n"
)

DOCUMENT_CONTEXT_PREFIX = (
    "Relevant excerpts from the user's uploaded documents. Prefer this over "
    "your general knowledge when it answers the question -- if these "
    "excerpts don't contain the answer, say so rather than guessing:\n"
    "{context}\n"
)


def build_chat_prompt(
    user_message: str,
    memory_context: str | None = None,
    document_context: str | None = None,
) -> str:
    """Wraps the user's raw message with recalled long-term memory and/or
    retrieved document excerpts, if any."""
    blocks = []
    if document_context:
        blocks.append(DOCUMENT_CONTEXT_PREFIX.format(context=document_context))
    if memory_context:
        blocks.append(MEMORY_CONTEXT_PREFIX.format(memories=memory_context))

    if not blocks:
        return user_message

    return "\n".join(blocks) + f"\nUser message: {user_message}"
