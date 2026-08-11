export type Activity = {
  name: string;
  solo: boolean;
  notSolo: boolean;
  sub?: string;
};

export type Category = {
  name: string;
  color: string;
  activities: Activity[];
};

const a = (
  name: string,
  solo: boolean,
  notSolo: boolean,
  sub?: string
): Activity => ({ name, solo, notSolo, sub });

export const categories: Category[] = [
  {
    name: "Learning",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    activities: [
      a("Math",             true,  true,  "Math"),
      a("Beast Academy",    true,  false, "Math"),
      a("Math rods",        true,  false, "Math"),
      a("Workbooks",        true,  false, "Math"),
      a("Language Arts",    true,  false, "Language Arts"),
      a("Story writing",    true,  false, "Writing"),
      a("Essay writing",    true,  false, "Writing"),
      a("Poem",             true,  false, "Writing"),
      a("Drama / script",   true,  true,  "Writing"),
      a("Science",          true,  false, "Science"),
      a("Experiments",      false, true,  "Science"),
      a("Social Studies",   true,  false, "Social Studies"),
      a("Spanish",          true,  true,  "Spanish"),
      a("MagnifiKid",       true,  false, "Religion"),
      a("Coding apps",      true,  false, "Coding"),
      a("Coding (instructional)", false, true, "Coding"),
      a("Moon Journaling",  true,  true),
      a("Presentations",    false, true),
    ],
  },
  {
    name: "Art & Creative",
    color: "bg-pink-100 text-pink-800 border-pink-200",
    activities: [
      a("Drawing / Art",    true, false, "Drawing"),
      a("Art Kids Hub",     true, false, "Drawing"),
      a("Alien draw",       true, false, "Drawing"),
      a("Watercolors",      true, false, "Painting"),
      a("Acrylics",         true, false, "Painting"),
      a("Coloring",         true, false, "Coloring"),
      a("Color by number",  true, false, "Coloring"),
      a("Stencils",         true, false, "Coloring"),
      a("Rainbow scratch",  true, false, "Coloring"),
      a("Lite-Brite",       true, false, "Coloring"),
      a("Water Wow / magic screen", true, false, "Coloring"),
      a("Building (lego / magnets / abacus)", true, false, "Building & Tactile"),
      a("Sculpting (play-doh / clay / kinetic sand)", true, false, "Building & Tactile"),
      a("Fort building",    true, true,  "Building & Tactile"),
      a("Paper Arts (cut-outs, origami, airplanes)", true, false, "Crafting"),
      a("KiwiCrate",        true, true,  "Crafting"),
      a("Sewing",           true, true,  "Crafting"),
    ],
  },
  {
    name: "Music",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    activities: [
      a("Piano (practice)",       true,  false, "Practice"),
      a("Ukulele (practice)",     true,  false, "Practice"),
      a("Violin (practice)",      true,  false, "Practice"),
      a("Listening to music",     true,  false, "Practice"),
      a("Singing",                true,  true,  "With Others"),
      a("Dancing",                true,  true,  "With Others"),
      a("Playing music together", false, true,  "With Others"),
      a("Piano (lesson)",         false, true,  "With Others"),
      a("Violin (lesson)",        false, true,  "With Others"),
    ],
  },
  {
    name: "Books & Reading",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    activities: [
      a("Self-reading",        true,  false),
      a("Audio stories",       true,  false),
      a("Large picture books", true,  true),
      a("Dad read-aloud",      false, true),
      a("Leapfrog Pen books",  false, true),
    ],
  },
  {
    name: "Games & Play",
    color: "bg-sky-100 text-sky-800 border-sky-200",
    activities: [
      a("Chess — learning app",   true,  false, "Solo Games"),
      a("Word search",            true,  false, "Solo Games"),
      a("Create mazes / puzzles", true,  false, "Solo Games"),
      a("Dictionary game",        true,  false, "Solo Games"),
      a("Pretend play",           true,  true,  "Pretend"),
      a("Dress up",               true,  true,  "Pretend"),
      a("Role-play (dolls / barn / trucks)", true, false, "Pretend"),
      a("Tea time",               false, true,  "Pretend"),
      a("Storytelling / acting",  false, true,  "Pretend"),
      a("Chess (with partner)",   false, true,  "Board & Strategy"),
      a("Checkers",               false, true,  "Board & Strategy"),
      a("Connect-4",              false, true,  "Board & Strategy"),
      a("Pokémon",                false, true,  "Board & Strategy"),
      a("Bingo",                  false, true,  "Board & Strategy"),
      a("Boardgames",             false, true,  "Board & Strategy"),
      a("Simon Says",             false, true,  "Social"),
      a("Story cards",            false, true,  "Social"),
      a("Family photo viewing",   false, true,  "Social"),
    ],
  },
  {
    name: "Physical",
    color: "bg-green-100 text-green-800 border-green-200",
    activities: [
      a("Cosmic Yoga",       true,  false, "Solo"),
      a("Trampoline",        true,  false, "Solo"),
      a("Gymnastics bar",    true,  false, "Solo"),
      a("Walk",              false, true,  "With Others"),
      a("Park / Visit",      false, true,  "With Others"),
      a("Bike / Scooter",    false, true,  "With Others"),
      a("Tennis",            false, true,  "With Others"),
      a("Ju Jitsu",          false, true,  "With Others"),
      a("Swim",              false, true,  "With Others"),
      a("Gymnastics",        false, true,  "With Others"),
      a("Yard / Garden work",true,  true,  "With Others"),
    ],
  },
  {
    name: "Digital & Screen",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    activities: [
      a("IXL",        true, false),
      a("Video games",true, true),
      a("TV / Show",  true, true),
      a("iPad games", true, false),
    ],
  },
  {
    name: "Food",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    activities: [
      a("Breakfast", true, true),
      a("Snack",     true, true),
      a("Lunch",     true, true),
      a("Dinner",    true, true),
      a("Smoothie",  true, true),
    ],
  },
  {
    name: "Routine & Reset",
    color: "bg-rose-100 text-rose-800 border-rose-200",
    activities: [
      a("Make bed",        true,  false),
      a("Bath",            true,  false),
      a("Sleep prep",      true,  false),
      a("Relaxation activity", true, false),
      a("Cleaning house",  true,  true),
      a("Cooking",         false, true),
    ],
  },
  {
    name: "Outings & Errands",
    color: "bg-lime-100 text-lime-800 border-lime-200",
    activities: [
      a("Duke Park",      false, true, "Durham"),
      a("Watts",          false, true, "Durham"),
      a("East Campus",    false, true, "Durham"),
      a("Ninth St",       false, true, "Durham"),
      a("Hunky Dory",     false, true, "Durham"),
      a("Bulldega",       false, true, "Durham"),
      a("Cocoa Cinnamon", false, true, "Durham"),
      a("Fullsteam",      false, true, "Durham"),
      a("Mass",           false, true, "Errands"),
      a("Car errands",    false, true, "Errands"),
      a("Home Depot",     false, true, "Errands"),
      a("Roscoe Bath",    false, true, "Errands"),
    ],
  },
];
