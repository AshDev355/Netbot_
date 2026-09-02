export type Role = "user" | "bot";

export type Source = {
  id: string;
  tag: string;
  title: string;
  blurb: string;
  meta: string;
  match: number;
};

export type Message = {
  id: string;
  role: Role;
  text: string;
  cite?: string;
  pending?: boolean;
  toolsUsed?: string[];  // names of tools the bot called to answer this message
};

export type Conversation = {
  id: string;
  title: string;
  group: string;
  subtitle: string;
  messages: Message[];
  sources: Source[];
};

export const AVATAR_OPTIONS = [
  { id: "m", glyph: "M", background: "linear-gradient(135deg,#8FB8E8,#003876)", color: "white" },
  { id: "a", glyph: "A", background: "linear-gradient(135deg,#4A90E2,#001A3D)", color: "white" },
  { id: "n", glyph: "N", background: "linear-gradient(135deg,#6B7385,#1A1F2A)", color: "white" },
  { id: "half", glyph: "\u25D0", background: "linear-gradient(135deg,#8A93A6,#2B3241)", color: "white" },
  { id: "star", glyph: "\u2726", background: "linear-gradient(135deg,#0A5CB0,#14181F)", color: "white" },
  { id: "diamond", glyph: "\u25C7", background: "linear-gradient(135deg,#E6EEF7,#4A90E2)", color: "var(--navy)" },
];

export const ENROLL_STEPS = [
  {
    id: "center",
    label: "Center",
    heading: ["Look straight", "at the camera."],
    copy: "Keep your face inside the frame. Well-lit, glasses off if you can.",
  },
  {
    id: "left",
    label: "Left",
    heading: ["Turn slowly", "to your left."],
    copy: "Keep your face inside the frame. Well-lit, glasses off if you can.",
  },
  {
    id: "right",
    label: "Right",
    heading: ["Now turn", "to your right."],
    copy: "Last one. Hold steady until the ring completes.",
  },
];
