export type Activity = {
  name: string;
  solo: boolean;
  notSolo: boolean;
};

export type Category = {
  name: string;
  color: string;
  activities: Activity[];
};

const a = (name: string, solo: boolean, notSolo: boolean): Activity => ({
  name,
  solo,
  notSolo,
});

export const categories: Category[] = [
  {
    name: "Learning",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    activities: [
      a("Math",                    true,  true),
      a("Language Arts",           true,  false),
      a("Science",                 true,  false),
      a("Social Studies",          true,  false),
      a("Spanish",                 true,  true),
      a("Story writing",           true,  false),
      a("Essay writing",           true,  false),
      a("Poem",                    true,  false),
      a("Drama / script",          true,  true),
      a("Beast Academy",           true,  false),
      a("Math rods",               true,  false),
      a("Workbooks",               true,  false),
      a("MagnifiKid",              true,  false),
      a("Moon Journaling",         true,  true),
      a("Experiments",             false, true),
      a("Presentations",           false, true),
      a("Coding apps",             true,  false),
      a("Coding (instructional)",  false, true),
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
    name: "Art & Creative",
    color: "bg-pink-100 text-pink-800 border-pink-200",
    activities: [
      a("Drawing / Art",                      true,  false),
      a("Art Kids Hub",                       true,  false),
      a("Alien draw",                         true,  false),
      a("Watercolors",                        true,  false),
      a("Acrylics",                           true,  false),
      a("Coloring",                           true,  false),
      a("Color by number",                    true,  false),
      a("Stencils",                           true,  false),
      a("Rainbow scratch",                    true,  false),
      a("Lite-Brite",                         true,  false),
      a("Water Wow / magic screen",           true,  false),
      a("Paper Arts (cut-outs, origami, airplanes)", true, false),
      a("Sculpting (play-doh / clay / kinetic sand)", true, false),
      a("Building (lego / magnets / abacus)", true,  false),
      a("Fort building",                      true,  true),
      a("KiwiCrate",                          true,  true),
      a("Sewing",                             true,  true),
    ],
  },
  {
    name: "Music",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    activities: [
      a("Piano (practice)",        true,  false),
      a("Ukulele (practice)",      true,  false),
      a("Violin (practice)",       true,  false),
      a("Listening to music",      true,  false),
      a("Singing",                 true,  true),
      a("Dancing",                 true,  true),
      a("Playing music together",  false, true),
      a("Piano (lesson)",          false, true),
      a("Violin (lesson)",         false, true),
    ],
  },
  {
    name: "Games & Play",
    color: "bg-sky-100 text-sky-800 border-sky-200",
    activities: [
      a("Chess — learning app",   true,  false),
      a("Word search",            true,  false),
      a("Create mazes / puzzles", true,  false),
      a("Dictionary game",        true,  false),
      a("Pretend play",           true,  true),
      a("Dress up",               true,  true),
      a("Role-play (dolls / barn / trucks)", true, false),
      a("Chess (with partner)",   false, true),
      a("Checkers",               false, true),
      a("Connect-4",              false, true),
      a("Pokémon",                false, true),
      a("Bingo",                  false, true),
      a("Boardgames",             false, true),
      a("Simon Says",             false, true),
      a("Story cards",            false, true),
      a("Tea time",               false, true),
      a("Storytelling / acting",  false, true),
      a("Family photo viewing",   false, true),
    ],
  },
  {
    name: "Physical",
    color: "bg-green-100 text-green-800 border-green-200",
    activities: [
      a("Cosmic Yoga",       true,  false),
      a("Trampoline",        true,  false),
      a("Gymnastics bar",    true,  false),
      a("Walk",              false, true),
      a("Park / Visit",      false, true),
      a("Bike / Scooter",    false, true),
      a("Tennis",            false, true),
      a("Ju Jitsu",          false, true),
      a("Swim",              false, true),
      a("Gymnastics",        false, true),
      a("Yard / Garden work",true,  true),
    ],
  },
  {
    name: "Quiet & Mindful",
    color: "bg-violet-100 text-violet-800 border-violet-200",
    activities: [
      a("Relaxation activity",            true,  false),
      a("Downtime (blankets & stuffies)", true,  false),
    ],
  },
  {
    name: "Digital & Screen",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    activities: [
      a("IXL",        true,  false),
      a("Video games",true,  true),
      a("TV / Show",  true,  true),
      a("iPad games", true,  false),
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
      a("Make bed",           true,  false),
      a("Bath",               true,  false),
      a("Sleep prep",         true,  false),
      a("Cleaning house",     true,  true),
      a("Cooking",            false, true),
    ],
  },
  {
    name: "Outings & Errands",
    color: "bg-lime-100 text-lime-800 border-lime-200",
    activities: [
      a("Duke Park",      false, true),
      a("Watts",          false, true),
      a("East Campus",    false, true),
      a("Ninth St",       false, true),
      a("Hunky Dory",     false, true),
      a("Bulldega",       false, true),
      a("Cocoa Cinnamon", false, true),
      a("Fullsteam",      false, true),
      a("Mass",           false, true),
      a("Car errands",    false, true),
      a("Home Depot",     false, true),
      a("Roscoe Bath",    false, true),
    ],
  },
];
