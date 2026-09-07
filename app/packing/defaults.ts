// Default template content used to seed a fresh install. Once persisted to
// the DB via /api/packing/templates, edits made in-app win over these defaults.
//
// Items are given stable ids so that per-trip check state survives item
// renames / reorders. Ids only need to be unique within their tab.

import type { TabDef } from './types';
import { rid } from './types';

function mkItems(...texts: string[]) {
  return texts.map((text) => ({ id: rid(), text }));
}

// ── Shared tabs ────────────────────────────────────────────────────────────────
export const DEFAULT_SHARED_TABS: TabDef[] = [
  {
    id: 'pretrip',
    label: 'Pre-Trip',
    color: '#4a90d9',
    sections: [
      { id: rid(), title: '4–7 Days Before', items: mkItems(
        'Clean fridge — use up food',
        'Cancel mail',
        'No Amazon deliveries during trip',
        'Contact maid',
        'Contact babysitters',
        'Clean car',
        'Wash Roscoe',
        'Install rack on car',
      ) },
      { id: rid(), title: '1–4 Days Before', items: mkItems(
        'Clean bed sheets',
        'Vacuum / mop',
        'Do laundry',
        'Declutter',
        'Wash dishes',
        'Clean surfaces',
        'Remove trash',
        'Unload & dry dishwasher',
        'Water indoor plants',
      ) },
      { id: rid(), title: '1–2 Days Before', items: mkItems(
        'Pull packing bins from shed / suitcases',
        'Pack',
        'Make grocery list',
        "Prep food (see Camping > Camp Meals)",
        'Audible lineup',
        'MP3 lineup',
        'Amazon Music playlists',
        'Trip games loaded',
      ) },
      { id: rid(), title: '1 Day Before', items: mkItems(
        'Tidy backyard',
        'Weed',
        'Wine-bottle waterers on plants',
        'Water outdoor plants',
        'Clean out fridge',
        'Roscoe bag & meds ready',
        'Dry food bag packed',
      ) },
      { id: rid(), title: 'Day Of', items: mkItems(
        "Move Mel's car to driveway",
        'Lock shed',
        'Draw blinds',
        'Kitchen light on timer',
        'Set thermostat to conserve',
        'Take trash out',
        'Unplug non-essentials',
        'Lock back gate (padlock)',
        'Lock back porch',
        'Turn off water supply (crawlspace)',
        'Lock fence gates',
        'Lock storm doors',
        'Set alarm',
      ) },
    ],
  },
  {
    id: 'tech',
    label: 'Tech & Media',
    color: '#e8926a',
    sections: [
      { id: rid(), title: 'Computing', items: mkItems('Laptop', 'External monitor', 'Keyboard (computer)', 'Mouse', 'Connector', 'Adapter') },
      { id: rid(), title: 'Mobile & Tablets', items: mkItems('Kindle / E-reader', 'iPad') },
      { id: rid(), title: 'Audio & Camera', items: mkItems('Earphones / buds', 'Headphones', 'Sound machine', 'Sonos with charger', 'Real camera', 'Joystick', 'MP3 player') },
      { id: rid(), title: 'Chargers', items: mkItems('Portable battery', 'Laptop chargers x2', 'iPhone charger cable', 'iPad charger cable', 'Android charger cable', 'Plug / power strip', 'Watch / headphone charger') },
      { id: rid(), title: 'Books', items: mkItems('Music binder / books', 'Novel', 'Essays / Poems', 'Histories', 'How-to / Explications', 'Josefina story book', 'Binder (Communion / Other)') },
      { id: rid(), title: 'Writing & Office', items: mkItems('Construction papers', 'Clipboard', 'Post-it notes', 'Journal', 'Sketch pad', 'Notebook', 'Scissors / glue stick', 'Staples', 'Crayon case', 'Markers', 'Colored pencils', 'Pen case (eraser, pencils, pens)') },
      { id: rid(), title: 'Music Instruments', items: mkItems('Picks', 'Mandolin', 'Ukelele / case / chart', 'Violin / case / chart', 'Bass / amp / cords', 'Cajon / drum pad / sticks', 'Guitar', 'Keyboard (instrument)', 'Banjo', 'Fiddle', 'Harmonica', 'Flute', 'Song binder / books') },
      { id: rid(), title: 'Games & Entertainment', items: mkItems('Card games', 'Board games', 'Tarot cards', 'Math rods', 'Puzzles', 'Trip games', 'Audible lineup loaded', 'Amazon Music playlists loaded') },
      { id: rid(), title: 'Meditation & Spiritual', items: mkItems('Smudge', 'Prayer flag', 'Rosary', 'Prayer bag') },
    ],
  },
  {
    id: 'camping',
    label: 'Camping',
    color: '#6b8f6b',
    onlyWhenCamping: true,
    sections: [
      { id: rid(), title: 'Shelter', items: mkItems('Tent', 'Tent poles / rods', 'Tent rainfly', 'Tarp / footprint', 'Extra tarp', 'Cordage', 'Stakes') },
      { id: rid(), title: 'Sleeping', items: mkItems('Sleeping bags (x2 — car)', 'Sleeping bag (tent)', 'Sleeping pad / mattress', 'Liners (x2)', 'Pillows (x2)', 'Roscoe bed') },
      { id: rid(), title: 'Seating & Shade', items: mkItems('Cot', 'Hammock / straps / bug net', 'Back jacks', 'Sand sheet / ground tarp', 'Beach chairs', 'Umbrella / overhead tarp', 'Towel (general / beach)') },
      { id: rid(), title: 'Lighting', items: mkItems('Head lamps (x2)', 'Flashlights', 'Work light', 'Lantern', 'Fairy lights', 'String lights') },
      { id: rid(), title: 'Tools & Safety', items: mkItems('Shovel', 'Axe / saw', 'Knife (utility)', 'Sharpener', 'Firestarter', 'Lighter', 'Waterproof matches', 'Firewood', 'Tinder (newspaper)', 'Extra batteries', 'Compass', 'Whistle', 'Speaker') },
      { id: rid(), title: 'Fire & Cooking', items: mkItems('Double burner stove', 'Tiny burner', 'Fire pit biolite', 'Propane', 'Mess kits', 'Pan', 'Pot holder', 'Hand towels', 'Utensils', 'Cutting board', 'Can opener', 'Kitchen knife', 'Oil / salt', 'Sponge', 'Dish soap / wipes', 'Trash bags', 'Orange bucket', 'Table cloth', 'Folding table', 'Biolite battery') },
      { id: rid(), title: 'Water', items: mkItems('Water bag / reservoir (3 gal/day)', 'Water filtration', 'Water bottles', 'Tea kettle', 'Teas') },
      { id: rid(), title: 'Swimming', items: mkItems('Goggles / cap', 'Swim outfit', 'Beach bucket / shovels', 'Sun sarong', 'Float barbell', 'Kickboard', 'Beach towels', 'Life jacket', 'Floaties') },
      { id: rid(), title: 'Bikes', items: mkItems('Bike', 'Bike helmet(s)', 'Lock', 'Bike light / pump') },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    color: '#d4a843',
    sections: [
      { id: rid(), title: 'Snacks', items: mkItems('Kind bars', 'Gummies', 'Cereal / cereal containers', 'Pretzels', 'Cheese', 'Carrots', 'Raisins / craisins', 'Dried fruits', 'Bananas', 'Apples', 'Almond butter', 'Yogurt', 'Trail mix packs', 'Granola bites') },
      { id: rid(), title: 'Breakfast Items', items: mkItems('Oatmeal / oatmeal packets', 'Waffles', 'Sausage', 'Avocado', 'Frozen pancakes', 'English muffins', 'Eggs (18 pack)', 'Bacon', 'Bread / buns', 'Instant coffee', 'Teas', 'Dried milk / stevia') },
      { id: rid(), title: 'Lunch Items', items: mkItems('Jelly / Nutella', 'Bread (sandwich)', 'Rice cakes', 'Tuna (6 cans)', 'Tuna fixings (mayo, banana pepper, mustard)', 'Mac & cheese', 'Crackers', 'Chips') },
      { id: rid(), title: 'Dinner Items', items: mkItems('Ground beef patties x4', 'Chicken sausage x4', 'Salmon filets x3–4', 'Burrito wraps x4', 'Sweet potatoes x4', 'Carrots', 'Zucchini / tomato / squash / onion / lemon', 'Green pepper / onion / potato (hash)', 'Rice portions', 'Heavy duty foil') },
      { id: rid(), title: 'Drinks & Condiments', items: mkItems('Seltzer water', 'Coffee', 'Water', 'Energy drink mix', 'Sugar / stevia', 'Salt / pepper / spices', 'Dressing', 'Cream cheese', 'MCT oil', 'Ketchup (small)', 'Oil (small bottle)', 'Maple syrup', 'Honey', 'Mayo (small)', 'Soy milk (for coffee)') },
      { id: rid(), title: 'Desserts & Extras', items: mkItems('Marshmallows', 'Chocolate bar', 'Red wine / spritzer / beer', "Brownie box (make at mom's)", 'Milk') },
      { id: rid(), title: 'Grocery List', items: mkItems('Cheese stix / Babybel', 'Oreo yogurt / yogurt cups', 'Grapes', 'Berries', 'Spice shaker', 'Containers / bags', 'Dishsoap / sponge', 'Dishsoap wipes (no-water)', 'Shaker / hand mixer', 'Jars for overnight oats', 'Vitamins', 'Pain reliever') },
      { id: rid(), title: 'Food Gear', items: mkItems('Coffee maker / frother', 'Water heater', 'Utensils / straw / fork / spoon', 'Mugs', 'Grill', 'Plates', 'Napkins', 'Water bottles', 'Cutting board', 'Stove', 'Fuel', 'Car cooler (pink)', 'Ice packs / ice water bottles', 'Larger cooler') },
      { id: rid(), title: 'Cooler Contents', items: mkItems('Milks', 'Eggs', 'Cheeses', 'Yogurts', 'Butter', 'Boiled eggs', 'Fruits', 'Dog food / treats', 'Tuna fixings', 'Burritos x4', 'Honey', 'Maple syrup', 'Bacon') },
      { id: rid(), title: "Prep at Mom's", items: mkItems(
        'Boil 18 eggs, cool, refrigerate',
        'Mix 6 cans tuna (banana pepper, mayo, mustard, salt) → container',
        'Salmon + zucchini/squash/carrot/rice in foil × 3',
        'Chicken sausage + peppers/onion/potato in foil × 2',
        'Portion oatmeal (½ cup each)',
        'Overnight oats baggies (oats, chia, protein, psyllium, maple syrup)',
        'Par-boil potatoes, cut into cubes',
        'Pre-cook carrots',
        'Freeze pancakes',
      ) },
    ],
    meals: [
      { id: rid(), name: 'Breakfast', note: 'Fina Pancakes (from frozen, warm on skillet)' },
      { id: rid(), name: 'Breakfast', note: 'Mom English Muffin w/ HB Eggs (2 eggs)' },
      { id: rid(), name: 'Breakfast', note: 'Mel HB Eggs (3 eggs)' },
      { id: rid(), name: 'Breakfast', note: 'Mom & Mel Overnight Oats (5 eggs × 3 days = 15 total)' },
      { id: rid(), name: 'Lunch', note: 'Fina Nutella Sandwiches (6 slices bread × 3 days = 18)' },
      { id: rid(), name: 'Lunch', note: 'KP/Mel Tuna Sandwiches (6 cans premixed)' },
      { id: rid(), name: 'Dinner', note: 'Burgers w/ Sweet Potatoes (skillet + firepit)' },
      { id: rid(), name: 'Dinner', note: 'Salmon & Veggies / Rice (portions in foil × 3)' },
      { id: rid(), name: 'Dinner', note: 'Chicken Sausage Hash Burrito (potato, pepper, onion — skillet)' },
      { id: rid(), name: 'Dinner', note: 'Oatmeal and Bacon (needs a pot — messiest)' },
      { id: rid(), name: 'Dessert', note: "S'mores (marshmallows + chocolate)" },
      { id: rid(), name: 'Dessert', note: 'Red wine' },
    ],
  },
  {
    id: 'kids',
    label: 'Kids & Dog',
    color: '#e87ca0',
    sections: [
      { id: rid(), title: 'Jo — Entertainment', items: mkItems('iPad', 'Headphones', 'Joystick', 'Audible / audiobooks loaded', 'Trip games downloaded') },
      { id: rid(), title: 'Jo — Books & Learning', items: mkItems('Books (assorted)', 'Activity books', 'Trace worksheets', 'Math rods', 'Stickers', 'Puzzles', 'Reading / music / math materials') },
      { id: rid(), title: 'Jo — Art & Toys', items: mkItems('Toys', 'Stuffies', 'Chalk / face paint', 'Crayon case', 'Dry erase pens', 'Markers', 'Colored pencils', 'Construction papers', 'Paints', 'Card games', 'Instruments (violin, keyboard, rods)') },
      { id: rid(), title: 'Jo — Health', items: mkItems('Vitamins', 'Steroid cream for bites', 'Allergy meds', 'Desitin rash cream', 'Tylenol / Motrin', 'Kid bandaids', 'Pull ups') },
      { id: rid(), title: 'Jo — Clothing', items: mkItems('Underwear', 'T-shirts', 'Shorts', 'Dresses', 'Socks', 'Coat / vest', 'Rain gear', 'Pajamas', 'Sunglasses', 'Shoes') },
      { id: rid(), title: 'Roscoe', color: '#a07850', items: mkItems('Harness', 'Leash', 'Poo bags', 'Treats & toys', 'Water / food bowls', 'Dog food', 'Meds', 'Bed', 'Roscoe bag') },
    ],
  },
  {
    id: 'car',
    label: 'Car',
    color: '#8a9ab0',
    cars: [
      {
        id: rid(),
        name: 'Red Car',
        color: '#c0392b',
        sections: [
          { id: rid(), heading: 'Roof Bins', zones: [
            { id: rid(), label: 'Bin 1', items: mkItems('Dry food bag', 'Sonos / sound machine', 'Kitchen stuff') },
            { id: rid(), label: 'Bin 2', items: mkItems('Books', 'Binders') },
            { id: rid(), label: 'Bin 3', items: mkItems('Jo art supplies', 'Jo toys / games', 'Extra oversize stuff') },
            { id: rid(), label: 'Top of bins', items: mkItems('Mel duffle (clothes)', 'First aid', 'Shoes', 'Toiletries') },
          ] },
          { id: rid(), heading: 'Inside', zones: [
            { id: rid(), label: 'Driver foot area', items: mkItems('Roscoe bag', 'Flash bag') },
            { id: rid(), label: 'Passenger foot area', items: mkItems('Mel CPU bookbag', 'KP bookbag', 'Ladybug bag') },
            { id: rid(), label: "Jo's seat", items: mkItems('Lap bag (iPad, headphones)') },
            { id: rid(), label: 'Trunk', items: mkItems('Yoga mat', 'Coolers', 'Instruments / amps', 'Beach chairs', 'Beach/pool bag') },
          ] },
        ],
      },
      {
        id: rid(),
        name: 'Green Car',
        color: '#27ae60',
        sections: [
          { id: rid(), heading: 'Roof Bins', zones: [
            { id: rid(), label: 'Bin 1', items: mkItems('Dry food bag', 'Sonos / sound machine', 'Kitchen stuff', 'CPU/tech') },
            { id: rid(), label: 'Bin 2', items: mkItems('KP duffle (clothes)', 'First aid', 'Shoes', 'Toiletries') },
            { id: rid(), label: 'Bin 3', items: mkItems('Jo art supplies', 'Jo toys / games', 'Extra oversize stuff') },
            { id: rid(), label: 'Bin 4', items: mkItems('Roscoe bag', 'Flash bag') },
          ] },
          { id: rid(), heading: 'Inside', zones: [
            { id: rid(), label: 'Driver foot area', items: mkItems('Mel bookbag') },
            { id: rid(), label: 'Passenger foot area', items: mkItems('Nothing') },
            { id: rid(), label: "Jo's seat", items: mkItems('Mel duffle 1', 'Mel duffle 2', 'Lap bag (iPad, headphones)') },
            { id: rid(), label: 'Trunk', items: mkItems('Instruments / amps', 'Kitchen / food bags', 'KP CPU bookbag', 'Yoga mat', 'Coolers', 'Beach chairs', 'Beach/pool bag', 'KP bookbag') },
          ] },
        ],
      },
    ],
  },
];

// ── Per-user tabs (each user starts with an identical copy that they can edit) ─
function defaultUserTabs(): TabDef[] {
  return [
    {
      id: 'clothing',
      label: 'Clothing',
      color: '#7cb87c',
      sections: [
        { id: rid(), title: 'Underlayer',    items: mkItems('Underwear', 'Socks', 'T-shirts', 'Long johns', 'Gloves', 'Pajamas') },
        { id: rid(), title: 'Outer / Casual', items: mkItems('Sweater', 'Fleece / vest / coat', 'Synthetic shell', 'Dress(es)', 'Shorts / pants', 'Button-up shirt', 'Polos') },
        { id: rid(), title: 'Footwear',      items: mkItems('Water shoes', 'Hiking shoes', 'Sandals', 'Dress shoes', 'Casual shoes', 'Running shoes') },
        { id: rid(), title: 'Workout',       items: mkItems('Workout T-shirts', 'Workout shorts', 'Running hat', 'Sunglasses') },
        { id: rid(), title: 'Swim & Sun',    items: mkItems('Swimsuit / pool shorts', 'Pool T-shirt', 'Sun hat (pool bag)') },
        { id: rid(), title: 'Rain Gear',     items: mkItems('Rain coat', 'Rain pants', 'Rain boots', 'Rain hat') },
      ],
    },
    {
      id: 'health',
      label: 'Health',
      color: '#c89ac8',
      sections: [
        { id: rid(), title: 'First Aid Kit',           items: mkItems('Antiseptic', 'Bandaids', 'Neosporin', 'Tick tweezers', 'Thermometer', 'Hand sanitizer', 'Rash cream') },
        { id: rid(), title: 'Medications',             items: mkItems('Thyroid meds', 'Garlic', 'Throat spray / Echinacea', 'Slippery elm', 'Vitamins', 'Tylenol / Ibuprofen', 'Eyedrops', 'Emergen-C') },
        { id: rid(), title: 'Hair & Grooming',         items: mkItems('Brush', 'Nail clipper', 'Hairbands', 'Hair clips', 'Deodorant', 'Foot powder', 'Razor / shaving cream') },
        { id: rid(), title: 'Oral Hygiene',            items: mkItems('Floss & rinse', 'Toothbrush with caps', 'Toothpaste', 'Mouthguard') },
        { id: rid(), title: 'Glasses & Contacts',      items: mkItems('Glasses (computer)', 'Glasses (reading)', 'Glasses (driving / night)', 'Contacts', 'Contact solution') },
        { id: rid(), title: 'Topicals & Protection',   items: mkItems('H-salve', 'Thena / witch hazel', 'Tiger Balm', 'Chapstick', 'Sunscreen', 'Insect repellent') },
        { id: rid(), title: 'Shower',                  items: mkItems('Shampoo / conditioner', 'Soap', 'Wash cloth', 'Wipes / TP') },
        { id: rid(), title: 'Sleep & Relaxation',      items: mkItems('Ear plugs (x4–6)', 'Reading light', 'Night light plug', 'Eye cover / mask') },
      ],
    },
  ];
}

export const DEFAULT_MEL_TABS: TabDef[] = defaultUserTabs();
export const DEFAULT_KATHY_TABS: TabDef[] = defaultUserTabs();
