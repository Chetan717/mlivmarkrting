// ── Type Options ─────────────────────────────────────────────────────────────
export const MAIN_TYPES = [
  { name: "MLM", value: "MLM" },
  { name: "General", value: "General" },
];

export const MLM_SELECT_TYPES = [
  { name: "Today Trending", value: "Today_Trending" },
  { name: "Rank Promotion", value: "Rank_Promotion" },
  { name: "Rank Promotion B", value: "Rank_Promotion_B" },
  { name: "Capping", value: "Capping" },
  { name: "Thank You Banner B", value: "ThankYou_Banner_B" },
  { name: "Meeting", value: "Meeting" },
  { name: "Product", value: "Product" },
];

export const GENERAL_SELECT_TYPES = [
  { name: "Trending", value: "Trending" },
  { name: "Festival", value: "Festival" },

  { name: "Motivational", value: "Motivational" },
  { name: "Good Morning", value: "Good_Morning" },
  { name: "Devotional / Spiritual", value: "Devotional_Spiritual" },
  { name: "Leader Quotes", value: "Leader_Quotes" },
  { name: "Health Tips", value: "Health_Tips" },

  { name: "Bonanza", value: "Bonanza" },
  { name: "Achievements", value: "Achievements" },
  { name: "Achievements B", value: "Achievements_B" },
  { name: "Income", value: "Income" },
  { name: "Welcome / Closing", value: "Welcome_Closing" },
  { name: "Meeting", value: "Meeting" },
  { name: "Anniversary & Birthday", value: "Anniversary_Birthday" },
  { name: "Greeting & Wishes", value: "Greeting_Wishes" },
  {
    name: "Thank You (Birthday & Anniversary)",
    value: "ThankYou_Birthday_Anniversary",
  },
  { name: "Capping", value: "Capping" },
];

export const POSITION_OPTIONS = [
  { name: "Left", value: "left" },
  { name: "Right", value: "right" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 9);

// Auto-incrementing counter for numeric IDs (resets per page session)
let _idCounter = Date.now();
export const nextId = () => ++_idCounter;

export const emptyGraphicsLink = () => ({
  _key: uid(), // local React key only (not saved to Firestore)
  id: nextId(), // auto-generated numeric ID — not editable by user
  url: "",
  suggestionImage: "",
  Date: "",
  nameImageUrl: "",
  bannerId: "",
  position: "left",
  incmNameId: "",
  Filter: "true",
  active: "true",
  pass: "", // password-protected delete (checked against "5688")
});

export const INITIAL_FORM = {
  MainType: "",
  SelectType: "",
  Subtype: "",
  Company: "",
  Showcase_url: "",
  ShowCaseForm: "",
  Date: "",
  serial: "",
  Active: true,
  Launched: true,
  GraphicsLink: [emptyGraphicsLink()],
};

// ── Conditional helpers (ported from GraphicsLinkSingle) ──────────────────────

/** Types where nameImageUrl (Badge/Achievement graphic) is shown */
export const SHOW_NAME_IMAGE_TYPES = ["Achievements", "Achievements_B"];

/** Types where bannerId (badge/frame) is HIDDEN */
export const HIDE_BANNER_ID_TYPES = [
  "Festival",
  "Leader_Quotes",
  "Today_Trending",
  "ThankYou_Banner_B",
  "ThankYou_Birthday_Anniversary",
  "Meeting",
];

/** Types where position selector is HIDDEN */
export const HIDE_POSITION_TYPES = ["Festival", "Achievements"];

/** Default position override per type */
export const defaultPosition = (selType) =>
  selType === "Achievements" ? "right" : "left";

/** Filter dropdown labels */
export const filterLabels = (selType) =>
  selType === "Meeting"
    ? { show: "Host", hide: "Without Host" }
    : { show: "Show", hide: "Hide" };

/** Get SelectType options for a given MainType */
export const getSelectTypes = (mainType) =>
  mainType === "MLM"
    ? MLM_SELECT_TYPES
    : mainType === "General"
      ? GENERAL_SELECT_TYPES
      : [];

/** Delete password */
export const DELETE_PASS = "5688";
