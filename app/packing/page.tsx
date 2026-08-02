"use client";

import { useState, useCallback } from "react";

const STORAGE_PREFIX = "packing_v1_";

// ── DATA ──────────────────────────────────────────────────────────────────────

type Section = {
  title: string;
  color?: string;
  items?: string[];
  type?: "meals";
  meals?: { name: string; note: string }[];
};

type CarZone = { label: string; items: string[] };
type CarSection = { heading: string; zones: CarZone[] };
type Car = { name: string; color: string; sections: CarSection[] };

type Tab = {
  id: string;
  label: string;
  color: string;
  sections?: Section[];
  type?: "car";
  cars?: Car[];
};

const TABS: Tab[] = [
  {
    id: "pretrip",
    label: "Pre-Trip",
    color: "#4a90d9",
    sections: [
      {
        title: "4–7 Days Before",
        items: [
          "Clean fridge — use up food",
          "Cancel mail",
          "No Amazon deliveries during trip",
          "Contact maid",
          "Contact babysitters",
          "Clean car",
          "Wash Roscoe",
          "Install rack on car",
        ],
      },
      {
        title: "1–4 Days Before",
        items: [
          "Clean bed sheets",
          "Vacuum / mop",
          "Do laundry",
          "Declutter",
          "Wash dishes",
          "Clean surfaces",
          "Remove trash",
          "Unload & dry dishwasher",
          "Water indoor plants",
        ],
      },
      {
        title: "1–2 Days Before",
        items: [
          "Pull packing bins from shed / suitcases",
          "Pack",
          "Make grocery list",
          "Prep food (see Camping > Camp Meals)",
          "Audible lineup",
          "MP3 lineup",
          "Amazon Music playlists",
          "Trip games loaded",
        ],
      },
      {
        title: "1 Day Before",
        items: [
          "Tidy backyard",
          "Weed",
          "Wine-bottle waterers on plants",
          "Water outdoor plants",
          "Clean out fridge",
          "Roscoe bag & meds ready",
          "Dry food bag packed",
        ],
      },
      {
        title: "Day Of",
        items: [
          "Move Mel's car to driveway",
          "Lock shed",
          "Draw blinds",
          "Kitchen light on timer",
          "Set thermostat to conserve",
          "Take trash out",
          "Unplug non-essentials",
          "Lock back gate (padlock)",
          "Lock back porch",
          "Turn off water supply (crawlspace)",
          "Lock fence gates",
          "Lock storm doors",
          "Set alarm",
        ],
      },
    ],
  },
  {
    id: "clothing",
    label: "Clothing",
    color: "#7cb87c",
    sections: [
      {
        title: "Underlayer",
        items: ["Underwear", "Socks", "T-shirts", "Long johns", "Gloves", "Pajamas"],
      },
      {
        title: "Outer / Casual",
        items: ["Sweater", "Fleece / vest / coat", "Synthetic shell", "Dress(es)", "Shorts / pants", "Button-up shirt", "Polos"],
      },
      {
        title: "Footwear",
        items: ["Water shoes", "Hiking shoes", "Sandals", "Dress shoes", "Casual shoes", "Running shoes"],
      },
      { title: "Workout", items: ["Workout T-shirts", "Workout shorts", "Running hat", "Sunglasses"] },
      { title: "Swim & Sun", items: ["Swimsuit / pool shorts", "Pool T-shirt", "Sun hat (pool bag)"] },
      { title: "Rain Gear", items: ["Rain coat", "Rain pants", "Rain boots", "Rain hat"] },
    ],
  },
  {
    id: "health",
    label: "Health",
    color: "#c89ac8",
    sections: [
      {
        title: "First Aid Kit",
        items: ["Antiseptic", "Bandaids", "Neosporin", "Tick tweezers", "Thermometer", "Hand sanitizer", "Rash cream", "Kid bandaids", "Jo steroid cream", "Jo Tylenol / Motrin", "Jo allergy liquids"],
      },
      {
        title: "Medications",
        items: ["Thyroid meds", "Garlic", "Throat spray / Echinacea", "Slippery elm", "Vitamins", "Tylenol / Ibuprofen", "Eyedrops", "Emergen-C", "Toe meds"],
      },
      {
        title: "Hair & Grooming",
        items: ["Hair scissors", "Brush (hair / etc.)", "Mirror", "Nail clipper", "Hairbands", "Hair clips", "Deodorant", "Foot powder", "Razor / shaving cream"],
      },
      { title: "Oral Hygiene", items: ["Floss & rinse", "Toothbrush with caps", "Toothpaste", "Mouthguard"] },
      {
        title: "Glasses & Contacts",
        items: ["Glasses (computer)", "Glasses (reading)", "Glasses (driving / night)", "Contacts", "Contact solution"],
      },
      {
        title: "Topicals & Protection",
        items: ["H-salve", "Thena / witch hazel", "Tiger Balm", "Chapstick", "Sunscreen", "Insect repellent", "Protection vest / jacket"],
      },
      {
        title: "Shower",
        items: ["Shampoo / conditioner", "Soap", "Wash cloth", "Water sprayer for hair", "Wipes / TP"],
      },
      {
        title: "Sleep & Relaxation",
        items: ["Ear plugs (x4–6)", "Reading light (Mel, KPs)", "Night light plug", "Eye cover / mask"],
      },
      {
        title: "KP",
        items: ["KP night routine items", "Moisturizers", "Lotion", "Contact solution", "Water sprayer for hair"],
      },
    ],
  },
  {
    id: "tech",
    label: "Tech & Media",
    color: "#e8926a",
    sections: [
      {
        title: "Computing",
        items: ["Laptop", "External monitor", "Keyboard (computer)", "Mouse", "Connector", "Adapter"],
      },
      { title: "Mobile & Tablets", items: ["Kindle / E-reader", "iPad"] },
      {
        title: "Audio & Camera",
        items: ["Earphones / buds", "Headphones", "Sound machine", "Sonos with charger", "Real camera", "Joystick", "MP3 player"],
      },
      {
        title: "Chargers",
        items: ["Portable battery", "Laptop chargers x2", "iPhone charger cable", "iPad charger cable", "Android charger cable", "Plug / power strip", "Watch / headphone charger"],
      },
      {
        title: "Books",
        items: ["Music binder / books", "Novel", "Essays / Poems", "Histories", "How-to / Explications", "Josefina story book", "Binder (Communion / Other)"],
      },
      {
        title: "Writing & Office",
        items: ["Construction papers", "Clipboard", "Post-it notes", "Journal", "Sketch pad", "Notebook", "Scissors / glue stick", "Staples", "Crayon case", "Markers", "Colored pencils", "Pen case (eraser, pencils, pens)"],
      },
      {
        title: "Music Instruments",
        items: ["Picks", "Mandolin", "Ukelele / case / chart", "Violin / case / chart", "Bass / amp / cords", "Cajon / drum pad / sticks", "Guitar", "Keyboard (instrument)", "Banjo", "Fiddle", "Harmonica", "Flute", "Song binder / books"],
      },
      {
        title: "Games & Entertainment",
        items: ["Card games", "Board games", "Tarot cards", "Math rods", "Puzzles", "Trip games", "Audible lineup loaded", "Amazon Music playlists loaded"],
      },
      { title: "Meditation & Spiritual", items: ["Smudge", "Prayer flag", "Rosary", "Prayer bag"] },
    ],
  },
  {
    id: "camping",
    label: "Camping",
    color: "#6b8f6b",
    sections: [
      {
        title: "Shelter",
        items: ["Tent", "Tent poles / rods", "Tent rainfly", "Tarp / footprint", "Extra tarp", "Cordage", "Stakes"],
      },
      {
        title: "Sleeping",
        items: ["Sleeping bags (x2 — car)", "Sleeping bag (tent)", "Sleeping pad / mattress", "Liners (x2)", "Pillows (x2)", "Roscoe bed"],
      },
      {
        title: "Seating & Shade",
        items: ["Cot", "Hammock / straps / bug net", "Back jacks", "Sand sheet / ground tarp", "Beach chairs", "Umbrella / overhead tarp", "Towel (general / beach)"],
      },
      {
        title: "Lighting",
        items: ["Head lamps (x2)", "Flashlights", "Work light", "Lantern", "Fairy lights", "String lights"],
      },
      {
        title: "Tools & Safety",
        items: ["Shovel", "Axe / saw", "Knife (utility)", "Sharpener", "Firestarter", "Lighter", "Waterproof matches", "Firewood", "Tinder (newspaper)", "Extra batteries", "Compass", "Whistle", "Speaker"],
      },
      {
        title: "Fire & Cooking",
        items: ["Double burner stove", "Tiny burner", "Fire pit biolite", "Propane", "Mess kits", "Pan", "Pot holder", "Hand towels", "Utensils", "Cutting board", "Can opener", "Kitchen knife", "Oil / salt", "Sponge", "Dish soap / wipes", "Trash bags", "Orange bucket", "Table cloth", "Folding table", "Biolite battery"],
      },
      {
        title: "Water",
        items: ["Water bag / reservoir (3 gal/day)", "Water filtration", "Water bottles", "Tea kettle", "Teas"],
      },
      {
        title: "Swimming",
        items: ["Goggles / cap", "Swim outfit", "Beach bucket / shovels", "Sun sarong", "Float barbell", "Kickboard", "Beach towels", "Life jacket", "Floaties"],
      },
      { title: "Bikes", items: ["Bike", "Bike helmet(s)", "Lock", "Bike light / pump"] },
    ],
  },
  {
    id: "food",
    label: "Food",
    color: "#d4a843",
    sections: [
      {
        title: "Snacks",
        items: ["Kind bars", "Gummies", "Cereal / cereal containers", "Pretzels", "Cheese", "Carrots", "Raisins / craisins", "Dried fruits", "Bananas", "Apples", "Almond butter", "Yogurt", "Trail mix packs", "Granola bites"],
      },
      {
        title: "Breakfast Items",
        items: ["Oatmeal / oatmeal packets", "Waffles", "Sausage", "Avocado", "Frozen pancakes", "English muffins", "Eggs (18 pack)", "Bacon", "Bread / buns", "Instant coffee", "Teas", "Dried milk / stevia"],
      },
      {
        title: "Lunch Items",
        items: ["Jelly / Nutella", "Bread (sandwich)", "Rice cakes", "Tuna (6 cans)", "Tuna fixings (mayo, banana pepper, mustard)", "Mac & cheese", "Crackers", "Chips"],
      },
      {
        title: "Dinner Items",
        items: ["Ground beef patties x4", "Chicken sausage x4", "Salmon filets x3–4", "Burrito wraps x4", "Sweet potatoes x4", "Carrots", "Zucchini / tomato / squash / onion / lemon", "Green pepper / onion / potato (hash)", "Rice portions", "Heavy duty foil"],
      },
      {
        title: "Drinks & Condiments",
        items: ["Seltzer water", "Coffee", "Water", "Energy drink mix", "Sugar / stevia", "Salt / pepper / spices", "Dressing", "Cream cheese", "MCT oil", "Ketchup (small)", "Oil (small bottle)", "Maple syrup", "Honey", "Mayo (small)", "Soy milk (for coffee)"],
      },
      {
        title: "Desserts & Extras",
        items: ["Marshmallows", "Chocolate bar", "Red wine / spritzer / beer", "Brownie box (make at mom's)", "Milk"],
      },
      {
        title: "Grocery List",
        items: ["Cheese stix / Babybel", "Oreo yogurt / yogurt cups", "Grapes", "Berries", "Spice shaker", "Containers / bags", "Dishsoap / sponge", "Dishsoap wipes (no-water)", "Shaker / hand mixer", "Jars for overnight oats", "Vitamins", "Pain reliever"],
      },
      {
        title: "Food Gear",
        items: ["Coffee maker / frother", "Water heater", "Utensils / straw / fork / spoon", "Mugs", "Grill", "Plates", "Napkins", "Water bottles", "Cutting board", "Stove", "Fuel", "Car cooler (pink)", "Ice packs / ice water bottles", "Larger cooler"],
      },
      {
        title: "Cooler Contents",
        items: ["Milks", "Eggs", "Cheeses", "Yogurts", "Butter", "Boiled eggs", "Fruits", "Dog food / treats", "Tuna fixings", "Burritos x4", "Honey", "Maple syrup", "Bacon"],
      },
      {
        title: "Camp Meal Plan",
        type: "meals",
        meals: [
          { name: "Breakfast", note: "Fina Pancakes (from frozen, warm on skillet)" },
          { name: "Breakfast", note: "Mom English Muffin w/ HB Eggs (2 eggs)" },
          { name: "Breakfast", note: "Mel HB Eggs (3 eggs)" },
          { name: "Breakfast", note: "Mom & Mel Overnight Oats (5 eggs × 3 days = 15 total)" },
          { name: "Lunch", note: "Fina Nutella Sandwiches (6 slices bread × 3 days = 18)" },
          { name: "Lunch", note: "KP/Mel Tuna Sandwiches (6 cans premixed)" },
          { name: "Dinner", note: "Burgers w/ Sweet Potatoes (skillet + firepit)" },
          { name: "Dinner", note: "Salmon & Veggies / Rice (portions in foil × 3)" },
          { name: "Dinner", note: "Chicken Sausage Hash Burrito (potato, pepper, onion — skillet)" },
          { name: "Dinner", note: "Oatmeal and Bacon (needs a pot — messiest)" },
          { name: "Dessert", note: "S'mores (marshmallows + chocolate)" },
          { name: "Dessert", note: "Red wine" },
        ],
      },
      {
        title: "Prep at Mom's",
        items: [
          "Boil 18 eggs, cool, refrigerate",
          "Mix 6 cans tuna (banana pepper, mayo, mustard, salt) → container",
          "Salmon + zucchini/squash/carrot/rice in foil × 3",
          "Chicken sausage + peppers/onion/potato in foil × 2",
          "Portion oatmeal (½ cup each)",
          "Overnight oats baggies (oats, chia, protein, psyllium, maple syrup)",
          "Par-boil potatoes, cut into cubes",
          "Pre-cook carrots",
          "Freeze pancakes",
        ],
      },
    ],
  },
  {
    id: "kids",
    label: "Kids & Dog",
    color: "#e87ca0",
    sections: [
      {
        title: "Jo — Entertainment",
        items: ["iPad", "Headphones", "Joystick", "Audible / audiobooks loaded", "Trip games downloaded"],
      },
      {
        title: "Jo — Books & Learning",
        items: ["Books (assorted)", "Activity books", "Trace worksheets", "Math rods", "Stickers", "Puzzles", "Reading / music / math materials"],
      },
      {
        title: "Jo — Art & Toys",
        items: ["Toys", "Stuffies", "Chalk / face paint", "Crayon case", "Dry erase pens", "Markers", "Colored pencils", "Construction papers", "Paints", "Card games", "Instruments (violin, keyboard, rods)"],
      },
      {
        title: "Jo — Health",
        items: ["Vitamins", "Steroid cream for bites", "Allergy meds", "Desitin rash cream", "Tylenol / Motrin", "Kid bandaids", "Pull ups"],
      },
      {
        title: "Jo — Clothing",
        items: ["Underwear", "T-shirts", "Shorts", "Dresses", "Socks", "Coat / vest", "Rain gear", "Pajamas", "Sunglasses", "Shoes"],
      },
      {
        title: "Roscoe",
        color: "#a07850",
        items: ["Harness", "Leash", "Poo bags", "Treats & toys", "Water / food bowls", "Dog food", "Meds", "Bed", "Roscoe bag"],
      },
    ],
  },
  {
    id: "car",
    label: "Car",
    color: "#8a9ab0",
    type: "car",
    cars: [
      {
        name: "Red Car",
        color: "#c0392b",
        sections: [
          {
            heading: "Roof Bins",
            zones: [
              { label: "Bin 1", items: ["Dry food bag", "Sonos / sound machine", "Kitchen stuff"] },
              { label: "Bin 2", items: ["Books", "Binders"] },
              { label: "Bin 3", items: ["Jo art supplies", "Jo toys / games", "Extra oversize stuff"] },
              { label: "Top of bins", items: ["Mel duffle (clothes)", "First aid", "Shoes", "Toiletries"] },
            ],
          },
          {
            heading: "Inside",
            zones: [
              { label: "Driver foot area", items: ["Roscoe bag", "Flash bag"] },
              { label: "Passenger foot area", items: ["Mel CPU bookbag", "KP bookbag", "Ladybug bag"] },
              { label: "Jo's seat", items: ["Lap bag (iPad, headphones)"] },
              { label: "Trunk", items: ["Yoga mat", "Coolers", "Instruments / amps", "Beach chairs", "Beach/pool bag"] },
            ],
          },
        ],
      },
      {
        name: "Green Car",
        color: "#27ae60",
        sections: [
          {
            heading: "Roof Bins",
            zones: [
              { label: "Bin 1", items: ["Dry food bag", "Sonos / sound machine", "Kitchen stuff", "CPU/tech"] },
              { label: "Bin 2", items: ["KP duffle (clothes)", "First aid", "Shoes", "Toiletries"] },
              { label: "Bin 3", items: ["Jo art supplies", "Jo toys / games", "Extra oversize stuff"] },
              { label: "Bin 4", items: ["Roscoe bag", "Flash bag"] },
            ],
          },
          {
            heading: "Inside",
            zones: [
              { label: "Driver foot area", items: ["Mel bookbag"] },
              { label: "Passenger foot area", items: ["Nothing"] },
              { label: "Jo's seat", items: ["Mel duffle 1", "Mel duffle 2", "Lap bag (iPad, headphones)"] },
              { label: "Trunk", items: ["Instruments / amps", "Kitchen / food bags", "KP CPU bookbag", "Yoga mat", "Coolers", "Beach chairs", "Beach/pool bag", "KP bookbag"] },
            ],
          },
        ],
      },
    ],
  },
];

// ── STATE HELPERS ─────────────────────────────────────────────────────────────

function lsGet(key: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_PREFIX + key) === "1";
}

function lsSet(key: string, val: boolean) {
  if (val) localStorage.setItem(STORAGE_PREFIX + key, "1");
  else localStorage.removeItem(STORAGE_PREFIX + key);
}

function loadInitialStore(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const s: Record<string, boolean> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) {
      s[k.slice(STORAGE_PREFIX.length)] = true;
    }
  }
  return s;
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────

function getTabProgress(tab: Tab, store: Record<string, boolean>) {
  if (tab.type === "car") {
    let done = 0, total = 0;
    tab.cars!.forEach((car, carIdx) => {
      car.sections.forEach((csec, sIdx) => {
        csec.zones.forEach((zone, zIdx) => {
          const sKey = `car_${carIdx}_${sIdx}_${zIdx}`;
          total++;
          const allChecked = zone.items.length > 0 && zone.items.every((_, iIdx) => store[`${sKey}_${iIdx}`]);
          if (allChecked) done++;
        });
      });
    });
    return { done, total };
  }
  let done = 0, total = 0;
  tab.sections!.forEach((sec, sIdx) => {
    if (sec.type === "meals" || !sec.items?.length) return;
    total++;
    if (sec.items.every((_, iIdx) => store[`${tab.id}_${sIdx}_${iIdx}`])) done++;
  });
  return { done, total };
}

// ── SECTION COMPONENT ─────────────────────────────────────────────────────────

function ChecklistSection({
  tab,
  sec,
  sIdx,
  store,
  onSet,
}: {
  tab: Tab;
  sec: Section;
  sIdx: number;
  store: Record<string, boolean>;
  onSet: (key: string, val: boolean) => void;
}) {
  const color = sec.color || tab.color;

  if (sec.type === "meals") {
    return (
      <div style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", background: "#fff" }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1e1e1e" }}>{sec.title}</span>
          <span style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>reference</span>
        </div>
        <ul style={{ padding: "4px 14px 12px", listStyle: "none" }}>
          {sec.meals!.map((m, i) => (
            <li key={i} style={{ padding: "8px 0", borderBottom: i < sec.meals!.length - 1 ? "1px solid #f2f1ed" : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#2c2c2c" }}>{m.name}</div>
              <div style={{ fontSize: 12, fontStyle: "italic", color: "#888", marginTop: 1 }}>{m.note}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const items = sec.items || [];
  const checkedCount = items.filter((_, iIdx) => store[`${tab.id}_${sIdx}_${iIdx}`]).length;
  const allDone = items.length > 0 && checkedCount === items.length;
  const isCollapsed = allDone || !!store[`collapse_${tab.id}_${sIdx}`];

  function toggleCollapse() {
    onSet(`collapse_${tab.id}_${sIdx}`, !isCollapsed);
  }

  function toggleItem(iIdx: number, val: boolean) {
    onSet(`${tab.id}_${sIdx}_${iIdx}`, val);
  }

  function toggleAll(val: boolean) {
    items.forEach((_, iIdx) => onSet(`${tab.id}_${sIdx}_${iIdx}`, val));
  }

  const allChecked = checkedCount === items.length && items.length > 0;
  const someChecked = checkedCount > 0 && !allChecked;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        marginBottom: 10,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        opacity: allDone ? 0.72 : 1,
        transition: "opacity 0.3s",
      }}
    >
      <div
        onClick={toggleCollapse}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", cursor: "pointer", userSelect: "none", background: "#fff" }}
      >
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1e1e1e" }}>
          {sec.title}
          {allDone && <span style={{ fontWeight: 400, opacity: 0.6 }}> ✓</span>}
        </span>
        <span style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>{checkedCount} / {items.length}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 18, height: 18, color: "#bbb", flexShrink: 0, transition: "transform 0.25s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div style={{ overflow: "hidden", maxHeight: isCollapsed ? 0 : 2000, opacity: isCollapsed ? 0 : 1, transition: "max-height 0.3s ease, opacity 0.3s" }}>
        <ul style={{ padding: "0 14px 12px", listStyle: "none" }}>
          {items.map((item, iIdx) => {
            const checked = !!store[`${tab.id}_${sIdx}_${iIdx}`];
            return (
              <li
                key={iIdx}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", borderBottom: iIdx < items.length - 1 ? "1px solid #f2f1ed" : "none" }}
              >
                <input
                  type="checkbox"
                  id={`${tab.id}-${sIdx}-${iIdx}`}
                  checked={checked}
                  onChange={(e) => toggleItem(iIdx, e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "#555" }}
                />
                <label
                  htmlFor={`${tab.id}-${sIdx}-${iIdx}`}
                  style={{ fontSize: 14, color: checked ? "#b0aea8" : "#2c2c2c", cursor: "pointer", lineHeight: 1.4, transition: "color 0.2s", textDecoration: checked ? "line-through" : "none" }}
                >
                  {item}
                </label>
              </li>
            );
          })}
          <li style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", background: "#f5f3ef", borderTop: "1px solid #e8e5e0", marginTop: 4 }}>
            <input
              type="checkbox"
              id={`${tab.id}-${sIdx}-all`}
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked; }}
              onChange={(e) => toggleAll(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "#555" }}
            />
            <label htmlFor={`${tab.id}-${sIdx}-all`} style={{ fontSize: "0.82rem", color: "#888", fontStyle: "italic", cursor: "pointer" }}>All</label>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ── CAR ZONE COMPONENT ────────────────────────────────────────────────────────

function CarZoneSection({
  sKey,
  zone,
  carColor,
  store,
  onSet,
}: {
  sKey: string;
  zone: CarZone;
  carColor: string;
  store: Record<string, boolean>;
  onSet: (key: string, val: boolean) => void;
}) {
  const items = zone.items;
  const checkedCount = items.filter((_, iIdx) => store[`${sKey}_${iIdx}`]).length;
  const allDone = items.length > 0 && checkedCount === items.length;
  const isCollapsed = allDone || !!store[`collapse_${sKey}`];

  const allChecked = checkedCount === items.length && items.length > 0;
  const someChecked = checkedCount > 0 && !allChecked;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        marginBottom: 10,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        opacity: allDone ? 0.72 : 1,
      }}
    >
      <div
        onClick={() => onSet(`collapse_${sKey}`, !isCollapsed)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: carColor, flexShrink: 0, display: "inline-block" }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1e1e1e" }}>
          {zone.label}
          {allDone && <span style={{ fontWeight: 400, opacity: 0.6 }}> ✓</span>}
        </span>
        <span style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>{checkedCount} / {items.length}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 18, height: 18, color: "#bbb", flexShrink: 0, transition: "transform 0.25s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div style={{ overflow: "hidden", maxHeight: isCollapsed ? 0 : 2000, opacity: isCollapsed ? 0 : 1, transition: "max-height 0.3s ease, opacity 0.3s" }}>
        <ul style={{ padding: "0 14px 12px", listStyle: "none" }}>
          {items.map((item, iIdx) => {
            const checked = !!store[`${sKey}_${iIdx}`];
            return (
              <li key={iIdx} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", borderBottom: iIdx < items.length - 1 ? "1px solid #f2f1ed" : "none" }}>
                <input
                  type="checkbox"
                  id={`${sKey}-${iIdx}`}
                  checked={checked}
                  onChange={(e) => onSet(`${sKey}_${iIdx}`, e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "#555" }}
                />
                <label
                  htmlFor={`${sKey}-${iIdx}`}
                  style={{ fontSize: 14, color: checked ? "#b0aea8" : "#2c2c2c", cursor: "pointer", lineHeight: 1.4, textDecoration: checked ? "line-through" : "none" }}
                >
                  {item}
                </label>
              </li>
            );
          })}
          <li style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", background: "#f5f3ef", borderTop: "1px solid #e8e5e0", marginTop: 4 }}>
            <input
              type="checkbox"
              id={`${sKey}-all`}
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked; }}
              onChange={(e) => {
                const val = e.target.checked;
                items.forEach((_, iIdx) => onSet(`${sKey}_${iIdx}`, val));
              }}
              style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "#555" }}
            />
            <label htmlFor={`${sKey}-all`} style={{ fontSize: "0.82rem", color: "#888", fontStyle: "italic", cursor: "pointer" }}>All</label>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function PackingPage() {
  const [currentView, setCurrentView] = useState("hub");
  const [store, setStore] = useState<Record<string, boolean>>(loadInitialStore);

  const onSet = useCallback((key: string, val: boolean) => {
    lsSet(key, val);
    setStore((prev) => {
      const next = { ...prev };
      if (val) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);

  function resetAll() {
    if (!confirm("Reset all packing progress?")) return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    setStore({});
  }

  function goTo(id: string) {
    setCurrentView(id);
    window.scrollTo(0, 0);
  }

  const bg = "#f5f4f0";

  // ── HUB VIEW ──────────────────────────────────────────────────────────────

  if (currentView === "hub") {
    const active: Tab[] = [], done: Tab[] = [], na: Tab[] = [];
    TABS.forEach((tab) => {
      if (store[`na_${tab.id}`]) {
        na.push(tab);
      } else {
        const { done: d, total: t } = getTabProgress(tab, store);
        if (t > 0 && d === t) done.push(tab);
        else active.push(tab);
      }
    });
    const sorted = [...active, ...done, ...na];

    return (
      <div style={{ background: bg, minHeight: "100vh", paddingBottom: 40 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "12px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 12px 8px" }}>
            <button
              onClick={resetAll}
              style={{ background: "#3a3a3a", color: "#f0ede8", border: "none", borderRadius: 6, padding: "6px 13px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              Reset All
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 12px" }}>
            {sorted.map((tab) => {
              const isNa = !!store[`na_${tab.id}`];
              const { done: d, total: t } = getTabProgress(tab, store);
              const allDone = t > 0 && d === t;
              const pct = t > 0 ? (d / t) * 100 : 0;

              return (
                <div
                  key={tab.id}
                  style={{
                    background: isNa ? "#f4f4f2" : allDone ? "#f0f7f0" : "#fff",
                    borderRadius: 12,
                    padding: 14,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    border: `1px solid ${isNa ? "#d0d0cc" : allDone ? "#b8d8b8" : "#e0ddd8"}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    opacity: isNa ? 0.75 : 1,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#2c2c2c" }}>{tab.label}</div>
                  <div style={{ fontSize: 11, color: "#999" }}>{isNa ? "N/A" : `${d} / ${t}`}</div>
                  <div style={{ height: 5, background: "#ece9e4", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: isNa ? "100%" : `${pct}%`,
                        background: isNa ? "#c8c8c4" : tab.color,
                        transition: "width 0.35s ease",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                    <label style={{ fontSize: 11, color: "#999", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={isNa}
                        onChange={(e) => onSet(`na_${tab.id}`, e.target.checked)}
                        style={{ cursor: "pointer" }}
                      />
                      N/A
                    </label>
                    <button
                      onClick={() => goTo(tab.id)}
                      style={{
                        background: "none",
                        border: `1px solid ${tab.color}`,
                        borderRadius: 5,
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 500,
                        color: tab.color,
                        cursor: "pointer",
                      }}
                    >
                      Go →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── CHECKLIST VIEW ────────────────────────────────────────────────────────

  const tab = TABS.find((t) => t.id === currentView);
  if (!tab) return null;

  return (
    <div style={{ background: bg, minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <button
          onClick={() => goTo("hub")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #d0ccc8", borderRadius: 6, padding: "7px 14px", fontSize: 13, color: "#555", cursor: "pointer", margin: "12px 12px 4px" }}
        >
          ← Hub
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 600, padding: "8px 12px 14px", color: tab.color }}>{tab.label}</h2>

        <div style={{ padding: "0 12px" }}>
          {tab.type === "car" ? (
            <div>
              {tab.cars!.map((car, carIdx) => (
                <div key={carIdx}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: "#1e1e1e", padding: carIdx === 0 ? "4px 0 6px" : "18px 0 6px", borderBottom: "1px solid #e0ddd8", marginBottom: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: car.color, flexShrink: 0, display: "inline-block" }} />
                    {car.name}
                  </div>
                  {car.sections.map((csec, sIdx) => (
                    <div key={sIdx}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a9ab0", padding: "10px 0 4px" }}>
                        {csec.heading}
                      </div>
                      {csec.zones.map((zone, zIdx) => (
                        <CarZoneSection
                          key={zIdx}
                          sKey={`car_${carIdx}_${sIdx}_${zIdx}`}
                          zone={zone}
                          carColor={car.color}
                          store={store}
                          onSet={onSet}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            tab.sections!.map((sec, sIdx) => (
              <ChecklistSection
                key={sIdx}
                tab={tab}
                sec={sec}
                sIdx={sIdx}
                store={store}
                onSet={onSet}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
