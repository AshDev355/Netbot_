"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_OPTIONS } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { NetBotApiError } from "@/lib/api";
import FaceCamera, { type FaceCameraHandle } from "@/components/FaceCamera";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, reEnrollFace, deleteAccount } = useAuth();
  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0].id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reEnrolling, setReEnrolling] = useState(false);
  const [reEnrollError, setReEnrollError] = useState<string | null>(null);
  const [reEnrollDone, setReEnrollDone] = useState(false);
  const cameraRef = useRef<FaceCameraHandle | null>(null);

  const avatar = AVATAR_OPTIONS.find((a) => a.id === avatarId) ?? AVATAR_OPTIONS[0];
  const email = user?.email ?? "";
  const displayName = email.split("@")[0] || "there";

  async function handleReEnrollCapture() {
    setReEnrollError(null);
    const frame = await cameraRef.current?.capture();
    if (!frame) {
      setReEnrollError("Couldn't read your camera. Make sure it's enabled and try again.");
      return;
    }
    try {
      await reEnrollFace(frame);
      setReEnrollDone(true);
      window.setTimeout(() => {
        setReEnrolling(false);
        setReEnrollDone(false);
      }, 1200);
    } catch (err) {
      setReEnrollError(
        err instanceof NetBotApiError ? err.message : "Couldn't re-enroll your face. Try again.",
      );
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      router.replace("/");
    } catch (err) {
      setDeleting(false);
      setConfirmingDelete(false);
      alert(
        err instanceof NetBotApiError
          ? err.message
          : "Couldn't delete your account. Try again.",
      );
    }
  }

  return (
    <div className="profile-shell">
      <div className="profile-card">
        <div className="pc-head">
          <div
            className="pc-avatar"
            style={{ background: avatar.background, color: avatar.color }}
          >
            {avatar.glyph}
            <button
              type="button"
              className="cam"
              aria-label="Change avatar"
              onClick={() =>
                setAvatarId((prev) => {
                  const index = AVATAR_OPTIONS.findIndex((a) => a.id === prev);
                  return AVATAR_OPTIONS[(index + 1) % AVATAR_OPTIONS.length].id;
                })
              }
            >
              ✎
            </button>
          </div>

          <div className="pc-who">
            <b>{displayName}</b>
            <span>{email}</span>
            <div className="pc-badge">
              <span className="d" aria-hidden="true" />
              Face ID enrolled
            </div>
          </div>
        </div>

        <div className="pc-avatars">
          <span className="label">Avatar</span>
          {AVATAR_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`avn ${option.id === avatarId ? "on" : ""}`.trim()}
              style={{ background: option.background, color: option.color }}
              onClick={() => setAvatarId(option.id)}
              aria-label={`Use avatar ${option.glyph}`}
              aria-pressed={option.id === avatarId}
            >
              {option.glyph}
            </button>
          ))}
        </div>

        <div className="pc-body">
          <div className="pc-sec">Account</div>

          <div className="pc-row">
            <div className="ico" aria-hidden="true">
              ✉
            </div>
            <div className="lbl">
              Email
              <small>Signed in as</small>
            </div>
            <div className="val">{email}</div>
          </div>

          <button
            type="button"
            className="pc-row"
            onClick={() => {
              setReEnrolling(true);
              setReEnrollError(null);
              setReEnrollDone(false);
            }}
          >
            <div className="ico" aria-hidden="true">
              ◉
            </div>
            <div className="lbl">
              Re-enroll Face ID
              <small>Replace your stored face with a fresh capture</small>
            </div>
            <div className="chev" aria-hidden="true">
              ›
            </div>
          </button>

          <div className="pc-sec">Session</div>

          <button
            type="button"
            className="pc-row"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            <div className="ico" aria-hidden="true">
              ↩
            </div>
            <div className="lbl">Sign out</div>
            <div className="chev" aria-hidden="true">
              ›
            </div>
          </button>

          <button
            type="button"
            className="pc-row danger"
            onClick={() => setConfirmingDelete(true)}
          >
            <div className="ico" aria-hidden="true">
              🗑
            </div>
            <div className="lbl">
              Delete account
              <small>Removes chats, documents, and face data</small>
            </div>
            <div className="chev" aria-hidden="true">
              ›
            </div>
          </button>
        </div>
      </div>

      {reEnrolling && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reenroll-title"
          onClick={() => setReEnrolling(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4 id="reenroll-title">Re-enroll Face ID</h4>
            <p>Look at the camera and capture a fresh, well-lit shot.</p>

            <div style={{ position: "relative", width: 220, height: 220, margin: "16px auto" }}>
              <FaceCamera ref={cameraRef} active={reEnrolling && !reEnrollDone} />
            </div>

            {reEnrollError && <div className="field-error">{reEnrollError}</div>}
            {reEnrollDone && <p>✓ Face re-enrolled.</p>}

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setReEnrolling(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleReEnrollCapture}
                disabled={reEnrollDone}
              >
                Capture &amp; save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          onClick={() => !deleting && setConfirmingDelete(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4 id="delete-title">Delete your account?</h4>
            <p>
              This removes every conversation, the documents you indexed, and your enrolled face
              data. It cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Keep account
              </button>
              <button type="button" className="btn danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
