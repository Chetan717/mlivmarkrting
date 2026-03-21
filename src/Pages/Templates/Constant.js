// ── Type Options ─────────────────────────────────────────────────────────────
export const MAIN_TYPES = [
  { name: "MLM", value: "MLM" },
  { name: "General", value: "General" },
];
let _idCounter = Date.now(); // starts from timestamp so IDs are unique
export const nextId = () => ++_idCounter;

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
  { name: "Health Tips", value: "Health_Tips" },
  { name: "Welcome / Closing", value: "Welcome_Closing" },
  { name: "Bonanza", value: "Bonanza" },
  { name: "Meeting", value: "Meeting" },
  { name: "Good Morning", value: "Good_Morning" },
  { name: "Devotional / Spiritual", value: "Devotional_Spiritual" },
  { name: "Leader Quotes", value: "Leader_Quotes" },
  { name: "Achievements", value: "Achievements" },
  { name: "Achievements B", value: "Achievements_B" },
  { name: "Income", value: "Income" },
  { name: "One Day Income", value: "One_Day_Income" },
  { name: "Anniversary & Birthday", value: "Anniversary_Birthday" },
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

export const emptyGraphicsLink = () => ({
  _key: uid(), // local React key only (not saved)
  id: "",
  url: "",
  suggestionImage: "",
  Date: "",
  nameImageUrl: "",
  bannerId: "",
  position: "left",
  incmNameId: "",
  Filter: "",
  active: "true",
});

export const INITIAL_FORM = {
  MainType: "",
  SelectType: "",
  Showcase_url: "",
  Date: "",
  serial: "",
  Active: false,
  Launched: false,
  GraphicsLink: [emptyGraphicsLink()],
};

// Get select options based on MainType
export const getSelectTypes = (mainType) =>
  mainType === "MLM"
    ? MLM_SELECT_TYPES
    : mainType === "General"
      ? GENERAL_SELECT_TYPES
      : [];
