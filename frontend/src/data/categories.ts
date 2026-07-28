import { STATIC_CATEGORY_TRANSLATIONS } from './staticCategoryTranslations'

// IMPORTANT: `name` values are the API contract sent to /api/suggest-words
// (and used in backend prompts). They must remain in stable English. The
// `labelKey` / `groupKey` fields are i18n lookups for display only — the
// English `name` / `label` fields stay as English fallbacks via t().
export type StaticCategoryTargetLanguageCode = 'en' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'pl' | 'id' | 'ceb' | 'ko' | 'ru' | 'ja'
export type StaticCategoryLanguageStatus = 'stable' | 'experimental' | 'hidden'

export interface StaticCategoryTranslation {
  term: string
  needsReview?: boolean
  reviewNote?: string
  isFallback?: boolean
}

export type StaticCategoryTranslations = Record<StaticCategoryTargetLanguageCode, StaticCategoryTranslation>

export interface StaticCategoryLanguageMetadata {
  code: StaticCategoryTargetLanguageCode
  value: string
  label: string
  name: string
  nativeName: string
  status: StaticCategoryLanguageStatus
  reviewLabel?: string
  script: string
}

export const STATIC_CATEGORY_TRANSLATION_LANGUAGES: StaticCategoryLanguageMetadata[] = [
  { code: 'en', value: 'English', name: 'English', nativeName: 'English', label: 'English', status: 'stable', script: 'Latin' },
  { code: 'de', value: 'German', name: 'German', nativeName: 'Deutsch', label: 'Deutsch', status: 'stable', script: 'Latin' },
  { code: 'fr', value: 'French', name: 'French', nativeName: 'Français', label: 'Français', status: 'stable', script: 'Latin' },
  { code: 'es', value: 'Spanish', name: 'Spanish', nativeName: 'Español', label: 'Español', status: 'stable', script: 'Latin' },
  { code: 'pt', value: 'Portuguese', name: 'Portuguese', nativeName: 'Português', label: 'Português', status: 'stable', script: 'Latin' },
  { code: 'it', value: 'Italian', name: 'Italian', nativeName: 'Italiano', label: 'Italiano', status: 'stable', script: 'Latin' },
  { code: 'pl', value: 'Polish', name: 'Polish', nativeName: 'Polski', label: 'Polski', status: 'stable', script: 'Latin' },
  { code: 'id', value: 'Indonesian', name: 'Indonesian', nativeName: 'Bahasa Indonesia', label: 'Bahasa Indonesia', status: 'stable', script: 'Latin' },
  {
    code: 'ceb',
    value: 'Bisaya',
    name: 'Bisaya / Cebuano',
    nativeName: 'Bisaya / Cebuano',
    label: 'Bisaya / Cebuano',
    status: 'experimental',
    reviewLabel: 'review',
    script: 'Latin',
  },
  {
    code: 'ko',
    value: 'Korean',
    name: 'Korean',
    nativeName: '한국어',
    label: '한국어 (experimental)',
    status: 'experimental',
    reviewLabel: 'experimental',
    script: 'Hangul',
  },
  {
    code: 'ru',
    value: 'Russian',
    name: 'Russian',
    nativeName: 'Русский',
    label: 'Русский (experimental)',
    status: 'experimental',
    reviewLabel: 'experimental',
    script: 'Cyrillic',
  },
  {
    code: 'ja',
    value: 'Japanese',
    name: 'Japanese',
    nativeName: '日本語',
    label: '日本語 (experimental)',
    status: 'experimental',
    reviewLabel: 'experimental',
    script: 'Japanese',
  },
]

export const STATIC_CATEGORY_TARGET_LANGUAGES = STATIC_CATEGORY_TRANSLATION_LANGUAGES.filter(
  (language) => language.status !== 'hidden',
)

// The beta-visible subset for language PICKERS only (Library chooser/select,
// generate CategoryPicker). Resolvers keep using the full list above so decks
// and URLs in dropped languages still resolve. Values are wizard-space; the
// list itself lives in lib/languages.ts (BETA_TARGET_LANGUAGES) — kept as a
// plain literal here because importing lib/languages from this data module
// would invert the data←lib layering for one array.
const BETA_TARGET_LANGUAGE_VALUES = ['English', 'German', 'Spanish', 'French', 'Italian', 'Portuguese', 'Bisaya', 'Indonesian']
export const STATIC_CATEGORY_BETA_TARGET_LANGUAGES = STATIC_CATEGORY_TARGET_LANGUAGES.filter(
  (language) => BETA_TARGET_LANGUAGE_VALUES.includes(language.value),
)

export interface Category {
  id?: string
  name: string
  emoji: string
  labelKey: string
  description?: string
  language?: string
  group?: string
  public?: boolean
  default_part_of_speech?: string
  staticWordLevels?: CategoryWordLevel[]
  /** When set, render as a free-floating pill outside the grouped grid.
   *  `'bottom'` pins this category beneath all groups. */
  pinned?: 'bottom'
}

export interface CategoryWordEntry {
  id?: string
  categoryId?: string
  word: string
  level?: number
  order?: number
  part_of_speech?: string
  sense?: string
  note?: string
  translations?: StaticCategoryTranslations
}

export interface StaticCategoryVocabularyItem extends CategoryWordEntry {
  id: string
  categoryId: string
  level: number
  order: number
  part_of_speech: string
  sense: string
  translations: StaticCategoryTranslations
}

export interface SelectedCategoryVocabularyItem {
  conceptId: string
  itemId: string
  categoryId: string
  level: number
  order: number
  part_of_speech: string
  sense: string
  targetLanguage: StaticCategoryTargetLanguageCode
  targetLanguageName: string
  targetTerm: string
  helperLanguage: StaticCategoryTargetLanguageCode
  helperLanguageName: string
  helperTerm: string
  translations: StaticCategoryTranslations
}

export interface StaticCategorySelectionOptions {
  dedupeTargetTerms?: boolean
}

export interface CategoryWordLevel {
  level: number
  label: string
  words: Array<string | CategoryWordEntry>
}

export interface CategoryGroup {
  label: string
  emoji: string
  groupKey: string
  categories: Category[]
}

export interface ThematicDuplicateReport {
  sameSenseDuplicates: Array<{
    term: string
    legacyCategory: string
    ownerCategory: string
  }>
  ambiguousCandidates: Array<{
    term: string
    legacyCategory: string
    ownerCategory: string
    note: string
  }>
}

function wordLevel(level: number, label: string, words: string[], sense: string, partOfSpeech: string): CategoryWordLevel {
  return {
    level,
    label,
    words: words.map((word) => ({
      word,
      level,
      part_of_speech: partOfSpeech,
      sense,
    })),
  }
}

function nounLevel(level: number, label: string, words: string[], sense = 'fruit'): CategoryWordLevel {
  return wordLevel(level, label, words, sense, 'noun')
}

const ANIMAL_WORD_LEVELS: CategoryWordLevel[] = [
  {
    level: 1,
    label: 'Basic farm and pet animals',
    words: ['dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken'],
  },
  {
    level: 2,
    label: 'Small common animals',
    words: ['duck', 'rabbit', 'mouse', 'rat', 'frog', 'turtle', 'snake', 'lizard', 'bee', 'butterfly'],
  },
  {
    level: 3,
    label: 'Famous wild animals',
    words: ['lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'bear', 'wolf', 'fox', 'deer', 'monkey'],
  },
  {
    level: 4,
    label: 'Sea animals',
    words: ['dolphin', 'whale', 'shark', 'octopus', 'crab', 'lobster', 'seal', 'penguin', 'seahorse', 'jellyfish'],
  },
  {
    level: 5,
    label: 'Birds',
    words: ['eagle', 'owl', 'parrot', 'crow', 'swan', 'peacock', 'flamingo', 'ostrich', 'hummingbird', 'woodpecker'],
  },
  {
    level: 6,
    label: 'Insects and small creatures',
    words: ['ant', 'spider', 'mosquito', 'fly', 'beetle', 'grasshopper', 'dragonfly', 'snail', 'worm', 'scorpion'],
  },
  {
    level: 7,
    label: 'Distinctive mammals',
    words: ['kangaroo', 'koala', 'panda', 'camel', 'llama', 'alpaca', 'raccoon', 'skunk', 'hedgehog', 'squirrel'],
  },
  {
    level: 8,
    label: 'Large and powerful animals',
    words: ['crocodile', 'alligator', 'rhinoceros', 'hippopotamus', 'gorilla', 'chimpanzee', 'hyena', 'cheetah', 'leopard', 'meerkat'],
  },
  {
    level: 9,
    label: 'Less basic but useful animals',
    words: ['otter', 'beaver', 'badger', 'weasel', 'ferret', 'mole', 'bat', 'armadillo', 'sloth', 'anteater'],
  },
  {
    level: 10,
    label: 'Advanced / memorable animals',
    words: ['platypus', 'narwhal', 'walrus', 'manatee', 'lemur', 'orangutan', 'tapir', 'aardvark', 'pangolin', 'capybara'],
  },
]

const FRUIT_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Most common fruits', ['apple', 'banana', 'orange', 'grape', 'strawberry', 'lemon', 'peach', 'pear', 'cherry', 'watermelon']),
  nounLevel(2, 'Common everyday fruits', ['pineapple', 'mango', 'blueberry', 'raspberry', 'blackberry', 'plum', 'kiwi', 'melon', 'lime', 'grapefruit']),
  nounLevel(3, 'Common but slightly broader', ['coconut', 'avocado', 'apricot', 'nectarine', 'tangerine', 'mandarin', 'pomegranate', 'fig', 'date', 'cranberry']),
  nounLevel(4, 'Tropical and distinctive fruits', ['papaya', 'passion fruit', 'guava', 'lychee', 'dragon fruit', 'starfruit', 'persimmon', 'quince', 'cantaloupe', 'honeydew']),
  nounLevel(5, 'Berries and small fruits', ['blackcurrant', 'redcurrant', 'gooseberry', 'elderberry', 'mulberry', 'boysenberry', 'loganberry', 'cloudberry', 'lingonberry', 'huckleberry']),
  nounLevel(6, 'Large tropical / specialty fruits', ['plantain', 'jackfruit', 'durian', 'rambutan', 'mangosteen', 'longan', 'soursop', 'breadfruit', 'custard apple', 'cherimoya']),
  nounLevel(7, 'Citrus family', ['clementine', 'pomelo', 'kumquat', 'yuzu', 'calamansi', 'blood orange', 'satsuma', 'citron', 'bergamot orange', 'ugli fruit']),
  nounLevel(8, 'Orchard and wild fruits', ['damson', 'mirabelle', 'greengage', 'crabapple', 'medlar', 'rose hip', 'hawthorn berry', 'serviceberry', 'chokeberry', 'sea buckthorn']),
  nounLevel(9, 'Advanced exotic fruits', ['salak', 'sapodilla', 'feijoa', 'jabuticaba', 'acerola', 'cupuaçu', 'lucuma', 'marionberry', 'miracle fruit', 'horned melon']),
  nounLevel(10, 'Rare / advanced fruit vocabulary', ['açaí berry', 'goji berry', 'aronia berry', 'pawpaw', 'loquat', 'langsat', 'bael fruit', 'tamarillo', 'cashew apple', 'ackee']),
]

const VEGETABLE_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic everyday vegetables', ['carrot', 'potato', 'onion', 'tomato', 'cucumber', 'lettuce', 'garlic', 'corn', 'mushroom', 'broccoli'], 'culinary_vegetable'),
  nounLevel(2, 'Common cooking vegetables', ['cabbage', 'cauliflower', 'spinach', 'pea', 'green bean', 'bell pepper', 'chili pepper', 'zucchini', 'eggplant', 'pumpkin'], 'culinary_vegetable'),
  nounLevel(3, 'Roots and tubers', ['sweet potato', 'yam', 'beetroot', 'radish', 'turnip', 'parsnip', 'rutabaga', 'celeriac', 'taro', 'cassava'], 'culinary_vegetable'),
  nounLevel(4, 'Leafy greens and salad vegetables', ['kale', 'arugula', 'watercress', 'swiss chard', 'bok choy', 'collard greens', 'mustard greens', 'endive', 'escarole', 'radicchio'], 'culinary_vegetable'),
  nounLevel(5, 'Alliums, stems, and shoots', ['leek', 'scallion', 'shallot', 'chive', 'celery', 'asparagus', 'artichoke', 'fennel', 'bamboo shoot', 'heart of palm'], 'culinary_vegetable'),
  nounLevel(6, 'Cabbage family and related vegetables', ['brussels sprout', 'napa cabbage', 'savoy cabbage', 'red cabbage', 'kohlrabi', 'romanesco', 'broccolini', 'chinese broccoli', 'rapini', 'daikon'], 'culinary_vegetable'),
  nounLevel(7, 'Pods, beans, and sprouts', ['snap pea', 'snow pea', 'edamame', 'broad bean', 'lima bean', 'chickpea', 'lentil', 'okra', 'bean sprout', 'alfalfa sprout'], 'culinary_vegetable'),
  nounLevel(8, 'Squash, gourds, and similar vegetables', ['squash', 'butternut squash', 'acorn squash', 'spaghetti squash', 'pattypan squash', 'kabocha squash', 'delicata squash', 'chayote', 'bottle gourd', 'bitter melon'], 'culinary_vegetable'),
  nounLevel(9, 'Mushrooms and fungi used as vegetables', ['shiitake mushroom', 'oyster mushroom', 'portobello mushroom', 'enoki mushroom', 'porcini mushroom', 'chanterelle', 'morel', 'truffle', 'maitake mushroom', 'king oyster mushroom'], 'culinary_vegetable'),
  nounLevel(10, 'Advanced and regional vegetable vocabulary', ['lotus root', 'burdock root', 'jicama', 'malanga', 'salsify', 'crosne', 'nopales', 'fiddlehead fern', 'samphire', 'seaweed'], 'culinary_vegetable'),
]

const FOOD_DRINK_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic staple foods and meals', ['bread', 'rice', 'pasta', 'soup', 'sandwich', 'pizza', 'egg', 'cheese', 'meat', 'salad'], 'food_drink'),
  nounLevel(2, 'Everyday foods', ['noodles', 'cereal', 'oatmeal', 'pancake', 'toast', 'burger', 'fries', 'hot dog', 'steak', 'sausage'], 'food_drink'),
  nounLevel(3, 'Dairy and proteins', ['yogurt', 'butter', 'cream', 'ice cream', 'beef', 'pork', 'lamb', 'bacon', 'ham', 'meatball'], 'food_drink'),
  nounLevel(4, 'Common drinks', ['water', 'tea', 'coffee', 'juice', 'milk', 'soda', 'lemonade', 'smoothie', 'hot chocolate', 'mineral water'], 'food_drink'),
  nounLevel(5, 'Sweet foods and desserts', ['cake', 'cookie', 'biscuit', 'chocolate', 'candy', 'pie', 'muffin', 'donut', 'pudding', 'brownie'], 'food_drink'),
  nounLevel(6, 'Snacks and casual foods', ['cracker', 'popcorn', 'chips', 'pretzel', 'nachos', 'taco', 'burrito', 'dumpling', 'spring roll', 'sushi'], 'food_drink'),
  nounLevel(7, 'Condiments, sauces, and spreads', ['salt', 'pepper', 'sugar', 'honey', 'jam', 'mayonnaise', 'ketchup', 'mustard', 'soy sauce', 'peanut butter'], 'food_drink'),
  nounLevel(8, 'Meals and prepared dishes', ['curry', 'stew', 'roast', 'barbecue', 'omelet', 'lasagna', 'risotto', 'fried rice', 'ramen', 'kebab'], 'food_drink'),
  nounLevel(9, 'Baked goods and grains', ['roll', 'bun', 'bagel', 'croissant', 'waffle', 'tortilla', 'flatbread', 'pita', 'couscous', 'quinoa'], 'food_drink'),
  nounLevel(10, 'Advanced food and drinks', ['espresso', 'cappuccino', 'herbal tea', 'iced tea', 'coconut water', 'bubble tea', 'kombucha', 'tofu', 'hummus', 'falafel'], 'food_drink'),
]

const NUT_SEED_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Common nuts and snack seeds', ['almond', 'peanut', 'walnut', 'cashew', 'pistachio', 'hazelnut', 'pecan', 'chestnut', 'sunflower seed', 'pumpkin seed'], 'nut_seed'),
  nounLevel(2, 'Common pantry seeds and nuts', ['sesame seed', 'chia seed', 'flaxseed', 'poppy seed', 'hemp seed', 'pine nut', 'brazil nut', 'macadamia nut', 'mixed nuts', 'trail mix'], 'nut_seed'),
  nounLevel(3, 'Nut and seed foods', ['almond milk', 'almond flour', 'tahini', 'sesame oil', 'sunflower oil', 'pumpkin seed oil', 'nut butter', 'seed butter', 'granola', 'praline'], 'nut_seed'),
  nounLevel(4, 'Cooking and spice seeds', ['mustard seed', 'cumin seed', 'coriander seed', 'fennel seed', 'caraway seed', 'anise seed', 'dill seed', 'celery seed', 'fenugreek seed', 'nigella seed'], 'nut_seed'),
  nounLevel(5, 'Advanced and regional nuts and seeds', ['acorn', 'hickory nut', 'beech nut', 'kola nut', 'candlenut', 'pili nut', 'baru nut', 'ginkgo nut', 'fox nut', 'lotus seed'], 'nut_seed'),
]

const HOME_OBJECT_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic home objects and furniture', ['chair', 'table', 'bed', 'sofa', 'door', 'window', 'key', 'lamp', 'mirror', 'shelf'], 'home_object'),
  nounLevel(2, 'Rooms and home areas', ['house', 'apartment', 'room', 'kitchen', 'bathroom', 'bedroom', 'living room', 'hallway', 'balcony', 'garage'], 'home_object'),
  nounLevel(3, 'Kitchen and dining objects', ['plate', 'bowl', 'cup', 'glass', 'bottle', 'spoon', 'fork', 'knife', 'pan', 'pot'], 'home_object'),
  nounLevel(4, 'Bedroom and bathroom items', ['pillow', 'blanket', 'sheet', 'mattress', 'towel', 'toothbrush', 'toothpaste', 'soap', 'shampoo', 'toilet'], 'home_object'),
  nounLevel(5, 'Appliances and fixtures', ['fridge', 'oven', 'stove', 'microwave', 'kettle', 'toaster', 'dishwasher', 'washing machine', 'dryer', 'vacuum cleaner'], 'home_object'),
  nounLevel(6, 'Storage and containers', ['box', 'bag', 'basket', 'drawer', 'closet', 'wardrobe', 'cabinet', 'jar', 'can', 'envelope'], 'home_object'),
  nounLevel(7, 'Cleaning and household supplies', ['broom', 'mop', 'sponge', 'bucket', 'detergent', 'trash can', 'recycling bin', 'dustpan', 'cloth', 'laundry basket'], 'home_object'),
  nounLevel(8, 'Tools and repair objects', ['hammer', 'screwdriver', 'wrench', 'drill', 'nail', 'screw', 'ladder', 'tape measure', 'flashlight', 'toolbox'], 'home_object'),
  nounLevel(9, 'Desk and everyday objects', ['desk', 'book', 'notebook', 'pen', 'pencil', 'eraser', 'ruler', 'scissors', 'paper', 'calendar'], 'home_object'),
  nounLevel(10, 'Decor and household extras', ['curtain', 'blinds', 'cushion', 'vase', 'candle', 'picture frame', 'doormat', 'coat rack', 'remote control', 'clock'], 'home_object'),
]

const BODY_HEALTH_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic body parts', ['head', 'face', 'eye', 'ear', 'nose', 'mouth', 'hand', 'arm', 'leg', 'foot'], 'body_health'),
  nounLevel(2, 'More external body parts', ['hair', 'tooth', 'tongue', 'neck', 'shoulder', 'elbow', 'wrist', 'finger', 'knee', 'toe'], 'body_health'),
  nounLevel(3, 'Body areas and basic anatomy', ['back', 'chest', 'stomach', 'waist', 'hip', 'skin', 'bone', 'muscle', 'blood', 'heart'], 'body_health'),
  nounLevel(4, 'Organs and senses', ['brain', 'lung', 'liver', 'kidney', 'throat', 'breath', 'sight', 'hearing', 'smell', 'taste'], 'body_health'),
  wordLevel(5, 'Health states and feelings', ['healthy', 'sick', 'tired', 'hungry', 'thirsty', 'dizzy', 'weak', 'strong', 'sleepy', 'awake'], 'body_health', 'adjective'),
  nounLevel(6, 'Common symptoms', ['pain', 'fever', 'cough', 'cold', 'flu', 'headache', 'stomachache', 'sore throat', 'rash', 'nausea'], 'body_health'),
  nounLevel(7, 'Injuries and physical problems', ['cut', 'bruise', 'burn', 'wound', 'scar', 'swelling', 'bleeding', 'broken bone', 'sprain', 'infection'], 'body_health'),
  nounLevel(8, 'Care and treatment basics', ['medicine', 'pill', 'tablet', 'bandage', 'cast', 'injection', 'vaccine', 'thermometer', 'treatment', 'checkup'], 'body_health'),
  nounLevel(9, 'Health measurements and medical tests', ['body temperature', 'blood pressure', 'pulse', 'heartbeat', 'breathing', 'weight', 'height', 'x-ray', 'medical test', 'scan'], 'body_health'),
  nounLevel(10, 'Advanced body and health vocabulary', ['immune system', 'nervous system', 'digestive system', 'skeleton', 'joint', 'tendon', 'ligament', 'artery', 'vein', 'organ'], 'body_health'),
]

const CLOTHING_APPEARANCE_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic clothing', ['shirt', 'pants', 'dress', 'skirt', 'jacket', 'coat', 'sweater', 'shoes', 'socks', 'hat'], 'clothing_appearance'),
  nounLevel(2, 'Everyday clothes', ['t-shirt', 'jeans', 'shorts', 'suit', 'uniform', 'hoodie', 'scarf', 'gloves', 'belt', 'underwear'], 'clothing_appearance'),
  nounLevel(3, 'Footwear and accessories', ['boots', 'sandals', 'sneakers', 'slippers', 'high heels', 'tie', 'necklace', 'bracelet', 'ring', 'watch'], 'clothing_appearance'),
  nounLevel(4, 'Weather, sleep, and activity clothing', ['raincoat', 'swimsuit', 'pajamas', 'robe', 'apron', 'vest', 'cardigan', 'blazer', 'tracksuit', 'leggings'], 'clothing_appearance'),
  nounLevel(5, 'Clothing details and parts', ['button', 'zipper', 'pocket', 'collar', 'sleeve', 'hood', 'lace', 'buckle', 'heel', 'sole'], 'clothing_appearance'),
  nounLevel(6, 'Clothing materials', ['cotton', 'wool', 'leather', 'silk', 'denim', 'linen', 'polyester', 'nylon', 'fleece', 'velvet'], 'clothing_appearance'),
  wordLevel(7, 'Patterns and clothing styles', ['striped', 'checked', 'floral', 'plain', 'patterned', 'spotted', 'shiny', 'formal', 'casual', 'fashionable'], 'clothing_appearance', 'adjective'),
  nounLevel(8, 'Hair, grooming, and personal style', ['haircut', 'hairstyle', 'beard', 'mustache', 'bangs', 'ponytail', 'braid', 'wig', 'makeup', 'perfume'], 'clothing_appearance'),
  wordLevel(9, 'Appearance descriptors', ['tall', 'short', 'young', 'old', 'slim', 'muscular', 'clean', 'dirty', 'neat', 'messy'], 'clothing_appearance', 'adjective'),
  nounLevel(10, 'Advanced and cultural clothing', ['earrings', 'brooch', 'cufflink', 'handbag', 'sunglasses', 'helmet', 'cloak', 'veil', 'headscarf', 'kimono'], 'clothing_appearance'),
]

const NATURE_WEATHER_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic nature and weather', ['sun', 'moon', 'sky', 'cloud', 'rain', 'snow', 'wind', 'weather', 'tree', 'flower'], 'nature_weather'),
  nounLevel(2, 'Common outdoor places', ['grass', 'river', 'lake', 'sea', 'ocean', 'beach', 'forest', 'mountain', 'hill', 'field'], 'nature_weather'),
  nounLevel(3, 'Land and water features', ['island', 'desert', 'valley', 'cave', 'waterfall', 'stream', 'pond', 'coast', 'shore', 'cliff'], 'nature_weather'),
  nounLevel(4, 'Weather conditions', ['storm', 'thunder', 'lightning', 'fog', 'mist', 'rainbow', 'sunshine', 'breeze', 'frost', 'hail'], 'nature_weather'),
  nounLevel(5, 'Seasons and natural light', ['spring', 'summer', 'autumn', 'winter', 'season', 'sunrise', 'sunset', 'dawn', 'dusk', 'moonlight'], 'nature_weather'),
  nounLevel(6, 'Plants and natural parts', ['leaf', 'branch', 'root', 'seed', 'bush', 'plant', 'moss', 'fern', 'vine', 'bark'], 'nature_weather'),
  nounLevel(7, 'Earth, rocks, and terrain', ['earth', 'soil', 'mud', 'sand', 'stone', 'rock', 'pebble', 'boulder', 'dust', 'volcano'], 'nature_weather'),
  nounLevel(8, 'Ecosystems and habitats', ['jungle', 'rainforest', 'swamp', 'marsh', 'meadow', 'prairie', 'savanna', 'tundra', 'wetland', 'reef'], 'nature_weather'),
  nounLevel(9, 'Severe weather and natural events', ['hurricane', 'tornado', 'blizzard', 'drought', 'flood', 'earthquake', 'landslide', 'avalanche', 'wildfire', 'eruption'], 'nature_weather'),
  nounLevel(10, 'Advanced weather and environment', ['climate', 'atmosphere', 'temperature', 'humidity', 'forecast', 'drizzle', 'downpour', 'monsoon', 'tide', 'glacier'], 'nature_weather'),
]

const PLACE_BUILDING_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic public places', ['school', 'hospital', 'park', 'store', 'restaurant', 'cafe', 'hotel', 'bank', 'library', 'market'], 'place_building'),
  nounLevel(2, 'City buildings and services', ['post office', 'police station', 'fire station', 'pharmacy', 'supermarket', 'mall', 'cinema', 'theater', 'museum', 'church'], 'place_building'),
  nounLevel(3, 'Transport places', ['airport', 'train station', 'bus station', 'subway station', 'port', 'harbor', 'parking lot', 'gas station', 'bridge', 'tunnel'], 'place_building'),
  nounLevel(4, 'Work and education places', ['office', 'factory', 'warehouse', 'farm', 'university', 'college', 'classroom', 'laboratory', 'workshop', 'studio'], 'place_building'),
  nounLevel(5, 'Health, care, and activity places', ['clinic', "dentist's office", 'emergency room', 'medical center', 'nursing home', 'daycare center', 'veterinary clinic', 'gym', 'swimming pool', 'sports center'], 'place_building'),
  nounLevel(6, 'Shops and commercial places', ['bakery', 'butcher shop', 'bookstore', 'clothes shop', 'shoe store', 'toy store', 'florist', 'hair salon', 'laundromat', 'hardware store'], 'place_building'),
  nounLevel(7, 'Government and civic places', ['city hall', 'town hall', 'courthouse', 'embassy', 'consulate', 'prison', 'parliament', 'community center', 'public square', 'border crossing'], 'place_building'),
  nounLevel(8, 'Culture, leisure, and religion', ['stadium', 'zoo', 'aquarium', 'amusement park', 'playground', 'art gallery', 'concert hall', 'mosque', 'temple', 'synagogue'], 'place_building'),
  nounLevel(9, 'Accommodation and landmark buildings', ['hostel', 'motel', 'resort', 'campsite', 'cabin', 'cottage', 'palace', 'castle', 'tower', 'lighthouse'], 'place_building'),
  nounLevel(10, 'Advanced and specialized places', ['skyscraper', 'observatory', 'planetarium', 'monastery', 'cathedral', 'shrine', 'greenhouse', 'refinery', 'power plant', 'dam'], 'place_building'),
]

const TRANSPORT_TRAVEL_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic vehicles', ['car', 'bus', 'train', 'bicycle', 'motorcycle', 'plane', 'boat', 'ship', 'taxi', 'truck'], 'transport_travel'),
  nounLevel(2, 'Everyday transport', ['van', 'scooter', 'tram', 'subway', 'ferry', 'minibus', 'pickup truck', 'ambulance', 'fire truck', 'police car'], 'transport_travel'),
  nounLevel(3, 'Travel basics', ['ticket', 'passport', 'luggage', 'suitcase', 'backpack', 'map', 'route', 'trip', 'journey', 'destination'], 'transport_travel'),
  nounLevel(4, 'Road travel', ['road', 'street', 'highway', 'lane', 'traffic', 'traffic light', 'crosswalk', 'sidewalk', 'roundabout', 'intersection'], 'transport_travel'),
  nounLevel(5, 'Vehicle parts', ['wheel', 'tire', 'engine', 'seat', 'seat belt', 'steering wheel', 'brake', 'pedal', 'trunk', 'license plate'], 'transport_travel'),
  nounLevel(6, 'Public transport', ['bus stop', 'platform', 'fare', 'schedule', 'timetable', 'transfer', 'commuter', 'passenger', 'driver', 'conductor'], 'transport_travel'),
  nounLevel(7, 'Air travel', ['flight', 'airline', 'boarding pass', 'gate', 'terminal', 'runway', 'pilot', 'cabin', 'baggage claim', 'customs'], 'transport_travel'),
  nounLevel(8, 'Sea and rail travel', ['railway', 'track', 'carriage', 'locomotive', 'compartment', 'sleeper train', 'deck', 'cabin cruiser', 'lifeboat', 'anchor'], 'transport_travel'),
  nounLevel(9, 'Travel accommodation and planning', ['reservation', 'booking', 'itinerary', 'tour', 'guidebook', 'tourist', 'visitor', 'visa', 'travel insurance', 'currency exchange'], 'transport_travel'),
  nounLevel(10, 'Advanced transport and travel', ['helicopter', 'submarine', 'yacht', 'canoe', 'kayak', 'skateboard', 'roller skates', 'electric car', 'charging station', 'navigation'], 'transport_travel'),
]

const JOBS_PEOPLE_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic people and social roles', ['person', 'man', 'woman', 'child', 'baby', 'adult', 'teenager', 'stranger', 'neighbor', 'customer'], 'jobs_people'),
  nounLevel(2, 'Workplace roles', ['worker', 'employee', 'employer', 'boss', 'manager', 'assistant', 'secretary', 'receptionist', 'colleague', 'volunteer'], 'jobs_people'),
  nounLevel(3, 'Education and learning roles', ['teacher', 'professor', 'tutor', 'principal', 'librarian', 'researcher', 'scientist', 'coach', 'instructor', 'trainee'], 'jobs_people'),
  nounLevel(4, 'Health and emergency workers', ['doctor', 'nurse', 'dentist', 'surgeon', 'pharmacist', 'paramedic', 'therapist', 'veterinarian', 'firefighter', 'police officer'], 'jobs_people'),
  nounLevel(5, 'Service and hospitality jobs', ['waiter', 'waitress', 'chef', 'cook', 'baker', 'butcher', 'cleaner', 'barber', 'hairdresser', 'cashier'], 'jobs_people'),
  nounLevel(6, 'Trades and practical jobs', ['builder', 'carpenter', 'electrician', 'plumber', 'mechanic', 'painter', 'gardener', 'farmer', 'tailor', 'miner'], 'jobs_people'),
  nounLevel(7, 'Creative and media jobs', ['artist', 'musician', 'singer', 'actor', 'dancer', 'writer', 'photographer', 'designer', 'filmmaker', 'journalist'], 'jobs_people'),
  nounLevel(8, 'Business, law, and public roles', ['accountant', 'lawyer', 'judge', 'politician', 'diplomat', 'mayor', 'soldier', 'security guard', 'banker', 'entrepreneur'], 'jobs_people'),
  nounLevel(9, 'Technology and professional roles', ['engineer', 'programmer', 'developer', 'technician', 'architect', 'analyst', 'consultant', 'translator', 'interpreter', 'editor'], 'jobs_people'),
  nounLevel(10, 'Advanced society and specialist roles', ['ambassador', 'activist', 'historian', 'economist', 'psychologist', 'sociologist', 'archaeologist', 'astronomer', 'composer', 'poet'], 'jobs_people'),
]

const FEELINGS_STATES_WORD_LEVELS: CategoryWordLevel[] = [
  wordLevel(1, 'Basic emotions', ['happy', 'sad', 'angry', 'afraid', 'scared', 'calm', 'excited', 'nervous', 'surprised', 'bored'], 'feelings_states', 'adjective'),
  wordLevel(2, 'Common social feelings', ['lonely', 'proud', 'shy', 'embarrassed', 'jealous', 'grateful', 'hopeful', 'disappointed', 'confused', 'worried'], 'feelings_states', 'adjective'),
  wordLevel(3, 'Pleasant emotional states', ['cheerful', 'relaxed', 'peaceful', 'confident', 'comfortable', 'curious', 'interested', 'amused', 'satisfied', 'relieved'], 'feelings_states', 'adjective'),
  wordLevel(4, 'Unpleasant emotional states', ['upset', 'annoyed', 'frustrated', 'stressed', 'anxious', 'uncomfortable', 'impatient', 'restless', 'miserable', 'overwhelmed'], 'feelings_states', 'adjective'),
  wordLevel(5, 'Strong and memorable emotions', ['delighted', 'thrilled', 'amazed', 'shocked', 'terrified', 'furious', 'heartbroken', 'homesick', 'nostalgic', 'disgusted'], 'feelings_states', 'adjective'),
  nounLevel(6, 'Emotion nouns', ['joy', 'sadness', 'anger', 'fear', 'love', 'affection', 'stress', 'anxiety', 'shame', 'guilt'], 'feelings_states'),
  wordLevel(7, 'Mental states and attitudes', ['focused', 'distracted', 'certain', 'unsure', 'doubtful', 'determined', 'motivated', 'unmotivated', 'patient', 'open-minded'], 'feelings_states', 'adjective'),
  wordLevel(8, 'Relationship feelings', ['loved', 'ignored', 'accepted', 'rejected', 'respected', 'trusted', 'betrayed', 'forgiven', 'supported', 'included'], 'feelings_states', 'adjective'),
  wordLevel(9, 'Feeling and emotion verbs', ['feel', 'worry', 'miss', 'trust', 'doubt', 'hope', 'enjoy', 'hate', 'forgive', 'regret'], 'feelings_states', 'verb'),
  {
    level: 10,
    label: 'Advanced emotional vocabulary',
    words: ['content', 'resentful', 'envious', 'apprehensive', 'vulnerable', 'reluctant', 'eager', 'indifferent', 'empathy', 'compassion'].map((word) => ({
      word,
      level: 10,
      part_of_speech: ['empathy', 'compassion'].includes(word) ? 'noun' : 'adjective',
      sense: 'feelings_states',
    })),
  },
]

const EDUCATION_LEARNING_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic learning words', ['student', 'pupil', 'learner', 'lesson', 'class', 'homework', 'question', 'answer', 'word', 'sentence'], 'education_learning'),
  nounLevel(2, 'School materials', ['textbook', 'workbook', 'worksheet', 'flashcard', 'pencil case', 'highlighter', 'marker', 'glue stick', 'calculator', 'whiteboard'], 'education_learning'),
  nounLevel(3, 'School life and structure', ['subject', 'course', 'school day', 'school year', 'term', 'semester', 'attendance', 'recess', 'break time', 'classmate'], 'education_learning'),
  wordLevel(4, 'Learning actions', ['learn', 'study', 'read', 'write', 'listen', 'repeat', 'practice', 'memorize', 'understand', 'explain'], 'education_learning', 'verb'),
  nounLevel(5, 'Language and literacy', ['alphabet', 'letter', 'vowel', 'consonant', 'syllable', 'grammar', 'spelling', 'pronunciation', 'vocabulary', 'translation'], 'education_learning'),
  nounLevel(6, 'Math and science basics', ['addition', 'subtraction', 'multiplication', 'division', 'equation', 'formula', 'experiment', 'diagram', 'chart', 'lab report'], 'education_learning'),
  nounLevel(7, 'Tests and progress', ['test', 'exam', 'quiz', 'grade', 'score', 'result', 'mistake', 'correction', 'feedback', 'certificate'], 'education_learning'),
  nounLevel(8, 'Education systems and learning places', ['kindergarten', 'primary school', 'elementary school', 'middle school', 'high school', 'boarding school', 'language school', 'online course', 'campus', 'lecture hall'], 'education_learning'),
  nounLevel(9, 'Higher education and research', ['lecture', 'seminar', 'degree', 'diploma', "bachelor's degree", "master's degree", 'doctorate', 'thesis', 'research paper', 'scholarship'], 'education_learning'),
  nounLevel(10, 'Learning methods and abstract learning', ['knowledge', 'skill', 'ability', 'memory', 'concentration', 'study plan', 'learning goal', 'critical thinking', 'problem solving', 'lifelong learning'], 'education_learning'),
]

const SPORTS_HOBBIES_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Common sports', ['football', 'basketball', 'tennis', 'swimming', 'running', 'cycling', 'baseball', 'volleyball', 'golf', 'boxing'], 'sports_hobbies'),
  nounLevel(2, 'Exercise and outdoor activities', ['walking', 'hiking', 'jogging', 'dancing', 'yoga', 'pilates', 'gymnastics', 'skating', 'skiing', 'snowboarding'], 'sports_hobbies'),
  nounLevel(3, 'Team and racket sports', ['rugby', 'cricket', 'hockey', 'American football', 'badminton', 'table tennis', 'handball', 'dodgeball', 'lacrosse', 'water polo'], 'sports_hobbies'),
  nounLevel(4, 'Combat and strength sports', ['wrestling', 'karate', 'judo', 'taekwondo', 'kickboxing', 'weightlifting', 'bodybuilding', 'fencing', 'archery', 'martial arts'], 'sports_hobbies'),
  nounLevel(5, 'Water and adventure sports', ['surfing', 'sailing', 'rowing', 'canoeing', 'kayaking', 'diving', 'snorkeling', 'rock climbing', 'mountain biking', 'horseback riding'], 'sports_hobbies'),
  nounLevel(6, 'Sports equipment and awards', ['ball', 'racket', 'baseball bat', 'goal', 'net', 'puck', 'trophy', 'medal', 'whistle', 'scoreboard'], 'sports_hobbies'),
  nounLevel(7, 'Exercise and active hobbies', ['aerobics', 'stretching', 'jump rope', 'frisbee', 'pickleball', 'padel', 'racquetball', 'softball', 'field hockey', 'ice skating'], 'sports_hobbies'),
  nounLevel(8, 'Performance and media hobbies', ['comedy', 'magic', 'juggling', 'podcasting', 'blogging', 'vlogging', 'creative writing', 'storytelling', 'improvisation', 'acting'], 'sports_hobbies'),
  nounLevel(9, 'Competitive and outdoor hobbies', ['scuba diving', 'trail running', 'marathon', 'triathlon', 'orienteering', 'cheerleading', 'disc golf', 'parkour', 'table football', 'ultimate frisbee'], 'sports_hobbies'),
  nounLevel(10, 'Leisure and advanced hobbies', ['gardening', 'fishing', 'camping', 'birdwatching', 'stargazing', 'woodworking', 'model building', 'coin collecting', 'stamp collecting', 'geocaching'], 'sports_hobbies'),
]

const MUSIC_INSTRUMENT_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic music and common instruments', ['music', 'song', 'guitar', 'piano', 'drums', 'violin', 'flute', 'trumpet', 'microphone', 'headphones'], 'music_instruments'),
  nounLevel(2, 'More common instruments', ['keyboard', 'bass guitar', 'electric guitar', 'acoustic guitar', 'saxophone', 'clarinet', 'cello', 'harp', 'accordion', 'harmonica'], 'music_instruments'),
  nounLevel(3, 'Singing and performance basics', ['voice', 'singing', 'melody', 'rhythm', 'beat', 'lyrics', 'chorus', 'verse', 'concert', 'performance'], 'music_instruments'),
  nounLevel(4, 'Percussion instruments', ['snare drum', 'bass drum', 'cymbal', 'tambourine', 'xylophone', 'marimba', 'triangle', 'gong', 'bongo', 'timpani'], 'music_instruments'),
  nounLevel(5, 'String instruments', ['banjo', 'ukulele', 'mandolin', 'viola', 'double bass', 'sitar', 'lute', 'lyre', 'zither', 'koto'], 'music_instruments'),
  nounLevel(6, 'Wind and brass instruments', ['trombone', 'tuba', 'French horn', 'recorder', 'oboe', 'bassoon', 'piccolo', 'bagpipes', 'pan flute', 'didgeridoo'], 'music_instruments'),
  nounLevel(7, 'Music notation and theory', ['note', 'scale', 'chord', 'harmony', 'tempo', 'pitch', 'musical key', 'sheet music', 'staff', 'clef'], 'music_instruments'),
  nounLevel(8, 'Recording and audio', ['recording', 'album', 'track', 'playlist', 'sound', 'volume', 'audio', 'remix', 'amplifier', 'sound system'], 'music_instruments'),
  nounLevel(9, 'Groups, events, and practice', ['band', 'orchestra', 'choir', 'solo', 'duet', 'trio', 'quartet', 'karaoke', 'music festival', 'rehearsal'], 'music_instruments'),
  nounLevel(10, 'Music genres and advanced vocabulary', ['classical music', 'jazz', 'rock music', 'pop music', 'hip hop', 'folk music', 'electronic music', 'reggae', 'opera', 'blues'], 'music_instruments'),
]

const ARTS_ENTERTAINMENT_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Art basics and supplies', ['art', 'drawing', 'painting', 'paint', 'paintbrush', 'canvas', 'sketch', 'sculpture', 'clay', 'easel'], 'arts_entertainment'),
  nounLevel(2, 'Crafts and handmade activities', ['crafts', 'knitting', 'sewing', 'embroidery', 'crochet', 'weaving', 'pottery', 'origami', 'collage', 'scrapbooking'], 'arts_entertainment'),
  nounLevel(3, 'Visual arts and design', ['illustration', 'portrait', 'landscape painting', 'still life', 'mural', 'graffiti art', 'calligraphy', 'printmaking', 'photography', 'digital art'], 'arts_entertainment'),
  nounLevel(4, 'Theater and stage', ['stage', 'stage play', 'drama', 'musical', 'scene', 'audience', 'prop', 'costume', 'applause', 'spotlight'], 'arts_entertainment'),
  nounLevel(5, 'Film and screen stories', ['film', 'documentary', 'short film', 'trailer', 'screenplay', 'director', 'character', 'plot', 'genre', 'special effects'], 'arts_entertainment'),
  nounLevel(6, 'Books, stories, and comics', ['story', 'novel', 'poem', 'comic book', 'manga', 'fairy tale', 'legend', 'chapter', 'narrator', 'cover art'], 'arts_entertainment'),
  nounLevel(7, 'Games and puzzles', ['game', 'board game', 'card game', 'chess', 'checkers', 'puzzle', 'jigsaw puzzle', 'crossword', 'riddle', 'dice'], 'arts_entertainment'),
  nounLevel(8, 'Video games and arcade entertainment', ['game console', 'game controller', 'joystick', 'arcade game', 'game level', 'quest', 'avatar', 'player', 'high score', 'virtual world'], 'arts_entertainment'),
  nounLevel(9, 'Shows and live entertainment', ['show', 'live show', 'event', 'festival', 'carnival', 'circus', 'parade', 'magic show', 'comedy show', 'talent show'], 'arts_entertainment'),
  nounLevel(10, 'Advanced arts and entertainment', ['exhibition', 'installation art', 'masterpiece', 'abstract art', 'realism', 'surrealism', 'choreography', 'improvisation', 'critique', 'awards ceremony'], 'arts_entertainment'),
]

const TECHNOLOGY_MEDIA_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic devices', ['computer', 'laptop', 'smartphone', 'tablet computer', 'camera', 'television', 'radio', 'screen', 'charger', 'battery'], 'technology_media'),
  nounLevel(2, 'Computer and office technology', ['computer keyboard', 'computer mouse', 'monitor', 'printer', 'scanner', 'webcam', 'speaker', 'cable', 'adapter', 'projector'], 'technology_media'),
  nounLevel(3, 'Internet and connectivity', ['internet', 'website', 'browser', 'search engine', 'Wi-Fi', 'network', 'router', 'modem', 'hotspot', 'connection'], 'technology_media'),
  nounLevel(4, 'Apps and software', ['app', 'software', 'program', 'file', 'folder', 'document', 'download', 'upload', 'update', 'notification'], 'technology_media'),
  nounLevel(5, 'Communication and messaging', ['email', 'message', 'text message', 'chat', 'video call', 'phone call', 'voicemail', 'contact', 'username', 'profile'], 'technology_media'),
  nounLevel(6, 'Social media and online content', ['social media', 'post', 'comment', 'like button', 'share button', 'follower', 'channel', 'livestream', 'podcast', 'blog'], 'technology_media'),
  nounLevel(7, 'Photos and video', ['photo', 'video', 'selfie', 'clip', 'frame', 'lens', 'tripod', 'filter', 'caption', 'thumbnail'], 'technology_media'),
  nounLevel(8, 'Media and entertainment', ['streaming', 'movie', 'series', 'episode', 'news', 'article', 'advertisement', 'subtitle', 'animation', 'subscription'], 'technology_media'),
  nounLevel(9, 'Data, storage, and security', ['password', 'passcode', 'login', 'account', 'cloud storage', 'backup', 'data', 'database', 'server', 'firewall'], 'technology_media'),
  nounLevel(10, 'Advanced and modern technology', ['artificial intelligence', 'robot', 'drone', 'virtual reality', 'augmented reality', 'smart home', '3D printer', 'cryptocurrency', 'algorithm', 'sensor'], 'technology_media'),
]

const MONEY_SHOPPING_SERVICES_WORD_LEVELS: CategoryWordLevel[] = [
  nounLevel(1, 'Basic money and shopping', ['money', 'cash', 'coin', 'banknote', 'wallet', 'price', 'receipt', 'payment', 'shop', 'shopping bag'], 'money_shopping_services'),
  wordLevel(2, 'Basic shopping and payment actions', ['buy', 'sell', 'pay', 'spend', 'save', 'cost', 'charge', 'borrow', 'lend', 'rent'], 'money_shopping_services', 'verb'),
  {
    level: 3,
    label: 'Prices and deals',
    words: ['cheap', 'expensive', 'free', 'discount', 'sale', 'coupon', 'bargain', 'tax', 'tip', 'total'].map((word) => ({
      word,
      level: 3,
      part_of_speech: ['cheap', 'expensive', 'free'].includes(word) ? 'adjective' : 'noun',
      sense: 'money_shopping_services',
    })),
  },
  nounLevel(4, 'Store and checkout vocabulary', ['shopping cart', 'shopping basket', 'checkout', 'cash register', 'barcode', 'price tag', 'display shelf', 'product', 'item', 'package'], 'money_shopping_services'),
  nounLevel(5, 'Banking basics', ['bank account', 'savings account', 'checking account', 'ATM', 'bank card', 'deposit', 'withdrawal', 'money transfer', 'loan', 'interest'], 'money_shopping_services'),
  nounLevel(6, 'Online shopping', ['online store', 'shopping app', 'online order', 'checkout page', 'delivery', 'shipping', 'tracking number', 'return', 'refund', 'review'], 'money_shopping_services'),
  nounLevel(7, 'Services and support', ['service', 'appointment', 'repair service', 'cleaning service', 'laundry service', 'delivery service', 'customer support', 'help desk', 'warranty', 'membership'], 'money_shopping_services'),
  nounLevel(8, 'Bills and household expenses', ['bill', 'invoice', 'rent payment', 'electricity bill', 'water bill', 'phone bill', 'internet bill', 'service fee', 'late fee', 'fine'], 'money_shopping_services'),
  nounLevel(9, 'Business and personal finance', ['salary', 'wage', 'income', 'budget', 'expense', 'profit', 'loss', 'investment', 'business', 'contract'], 'money_shopping_services'),
  nounLevel(10, 'Advanced money and finance', ['currency', 'exchange rate', 'inflation', 'debt', 'mortgage', 'insurance', 'premium', 'pension', 'stock', 'bond'], 'money_shopping_services'),
]

const THEMATIC_DUPLICATE_REPORT: ThematicDuplicateReport = {
  sameSenseDuplicates: [
    { term: 'apple', legacyCategory: 'Nouns (Things)', ownerCategory: 'Fruits' },
    { term: 'banana', legacyCategory: 'Nouns (Things)', ownerCategory: 'Fruits' },
    { term: 'fish', legacyCategory: 'Nouns (Things)', ownerCategory: 'Animals' },
    { term: 'potato', legacyCategory: 'Nouns (Things)', ownerCategory: 'Vegetables' },
    { term: 'tomato', legacyCategory: 'Nouns (Things)', ownerCategory: 'Vegetables' },
    { term: 'bread', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'water', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'coffee', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'tea', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'milk', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'juice', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'cheese', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'egg', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'meat', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'rice', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'pasta', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'soup', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'salad', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'sugar', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'salt', legacyCategory: 'Nouns (Things)', ownerCategory: 'Food & Drinks' },
    { term: 'chair', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'table', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'bed', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'door', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'window', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'key', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'lamp', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'house', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'apartment', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'bathroom', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'plate', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'cup', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'glass', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'bottle', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'spoon', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'fork', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'knife', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'bag', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'book', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'pen', legacyCategory: 'Nouns (Things)', ownerCategory: 'Home & Objects' },
    { term: 'school', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'hospital', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'park', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'store', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'restaurant', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'hotel', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'bank', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'library', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'market', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'pharmacy', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'cinema', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'museum', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'church', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'airport', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'office', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'bakery', legacyCategory: 'Nouns (Things)', ownerCategory: 'Places & Buildings' },
    { term: 'driver', legacyCategory: 'Nouns (Things)', ownerCategory: 'Transport & Travel' },
    { term: 'person', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'man', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'woman', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'child', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'neighbor', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'customer', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'worker', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'boss', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'teacher', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'doctor', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'nurse', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'police officer', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'waiter', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'cook', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'farmer', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'artist', legacyCategory: 'Nouns (Things)', ownerCategory: 'Jobs & People' },
    { term: 'computer', legacyCategory: 'Nouns (Things)', ownerCategory: 'Technology & Media' },
    { term: 'television', legacyCategory: 'Nouns (Things)', ownerCategory: 'Technology & Media' },
  ],
  ambiguousCandidates: [],
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Essentials',
    groupKey: 'category.group.essentials',
    emoji: '🎯',
    categories: [
      { name: 'Greetings & Introductions', emoji: '👋', labelKey: 'category.greetings' },
      { name: 'Food & Dining', emoji: '🍽️', labelKey: 'category.foodDining' },
      { name: 'Travel & Directions', emoji: '✈️', labelKey: 'category.travelDirections' },
      { name: 'Family & Relationships', emoji: '👨‍👩‍👧', labelKey: 'category.familyRelationships' },
      { name: 'Numbers & Time', emoji: '🔢', labelKey: 'category.numbersTime' },
    ],
  },
  {
    label: 'Living World',
    groupKey: 'category.group.livingWorld',
    emoji: '🌱',
    categories: [
      {
        id: 'animals',
        name: 'Animals',
        emoji: '🐾',
        labelKey: 'category.animals',
        description: 'Common, wild, sea, bird, insect, and advanced animal vocabulary.',
        language: 'English',
        group: 'Living World',
        public: true,
        staticWordLevels: ANIMAL_WORD_LEVELS,
      },
      {
        id: 'fruits',
        name: 'Fruits',
        emoji: '🍎',
        labelKey: 'category.fruits',
        description: 'Common, tropical, citrus, berry, orchard, and advanced fruit vocabulary.',
        language: 'English',
        group: 'Living World',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: FRUIT_WORD_LEVELS,
      },
      {
        id: 'vegetables',
        name: 'Vegetables',
        emoji: '🥕',
        labelKey: 'category.vegetables',
        description: 'Common vegetables, roots, leafy greens, stems, pods, squash, mushrooms, and advanced culinary vegetable vocabulary.',
        language: 'English',
        group: 'Living World',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: VEGETABLE_WORD_LEVELS,
      },
    ],
  },
  {
    label: 'Food & Kitchen',
    groupKey: 'category.group.foodKitchen',
    emoji: '🍽️',
    categories: [
      {
        id: 'food_drinks',
        name: 'Food & Drinks',
        emoji: '🍱',
        labelKey: 'category.foodDrinks',
        description: 'Common meals, staples, dairy, proteins, snacks, desserts, condiments, sauces, baked goods, and non-alcoholic drinks.',
        language: 'English',
        group: 'Food & Kitchen',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: FOOD_DRINK_WORD_LEVELS,
      },
      {
        id: 'nuts_seeds',
        name: 'Nuts & Seeds',
        emoji: '🥜',
        labelKey: 'category.nutsSeeds',
        description: 'Common nuts, edible seeds, pantry seeds, nut and seed products, and advanced regional nut and seed vocabulary.',
        language: 'English',
        group: 'Food & Kitchen',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: NUT_SEED_WORD_LEVELS,
      },
    ],
  },
  {
    label: 'Everyday Life',
    groupKey: 'category.group.everydayLife',
    emoji: '🏠',
    categories: [
      {
        id: 'home_objects',
        name: 'Home & Objects',
        emoji: '🛋️',
        labelKey: 'category.homeObjects',
        description: 'Common home vocabulary, furniture, rooms, household items, appliances, containers, cleaning supplies, tools, desk objects, and decor.',
        language: 'English',
        group: 'Everyday Life',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: HOME_OBJECT_WORD_LEVELS,
      },
      {
        id: 'body_health',
        name: 'Body & Health',
        emoji: '🩺',
        labelKey: 'category.bodyHealth',
        description: 'Body parts, body areas, organs, senses, health states, symptoms, injuries, treatment basics, medical measurements, and advanced body vocabulary.',
        language: 'English',
        group: 'Everyday Life',
        public: true,
        default_part_of_speech: 'mixed',
        staticWordLevels: BODY_HEALTH_WORD_LEVELS,
      },
      {
        id: 'clothing_appearance',
        name: 'Clothing & Appearance',
        emoji: '👕',
        labelKey: 'category.clothingAppearance',
        description: 'Clothes, footwear, accessories, jewelry, clothing parts, materials, patterns, grooming items, hairstyles, and basic appearance descriptors.',
        language: 'English',
        group: 'Everyday Life',
        public: true,
        default_part_of_speech: 'mixed',
        staticWordLevels: CLOTHING_APPEARANCE_WORD_LEVELS,
      },
    ],
  },
  {
    label: 'World & Travel',
    groupKey: 'category.group.worldTravel',
    emoji: '🌎',
    categories: [
      {
        id: 'nature_weather',
        name: 'Nature & Weather',
        emoji: '🌦️',
        labelKey: 'category.natureWeather',
        description: 'Common nature, landscapes, weather, seasons, plants, terrain, ecosystems, and natural events.',
        language: 'English',
        group: 'World & Travel',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: NATURE_WEATHER_WORD_LEVELS,
      },
      {
        id: 'places_buildings',
        name: 'Places & Buildings',
        emoji: '🏛️',
        labelKey: 'category.placesBuildings',
        description: 'Common public places, city buildings, services, transport places, work and education places, shops, civic places, cultural venues, accommodation, and specialized buildings.',
        language: 'English',
        group: 'World & Travel',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: PLACE_BUILDING_WORD_LEVELS,
      },
      {
        id: 'transport_travel',
        name: 'Transport & Travel',
        emoji: '🚆',
        labelKey: 'category.transportTravel',
        description: 'Vehicles, travel items, public transport, road, rail, air and sea travel, travel documents, navigation items, and useful trip vocabulary.',
        language: 'English',
        group: 'World & Travel',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: TRANSPORT_TRAVEL_WORD_LEVELS,
      },
    ],
  },
  {
    label: 'People & Society',
    groupKey: 'category.group.peopleSociety',
    emoji: '👥',
    categories: [
      {
        id: 'jobs_people',
        name: 'Jobs & People',
        emoji: '🧑‍💼',
        labelKey: 'category.jobsPeople',
        description: 'Basic people words, social roles, workplace roles, education roles, healthcare workers, emergency workers, service jobs, trades, creative jobs, public roles, technology jobs, and advanced professional roles.',
        language: 'English',
        group: 'People & Society',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: JOBS_PEOPLE_WORD_LEVELS,
      },
      {
        id: 'feelings_states',
        name: 'Feelings & States',
        emoji: '🙂',
        labelKey: 'category.feelingsStates',
        description: 'Basic emotions, social feelings, pleasant and unpleasant emotional states, intense feelings, emotion nouns, mental states, relationship feelings, feeling verbs, and advanced emotional vocabulary.',
        language: 'English',
        group: 'People & Society',
        public: true,
        default_part_of_speech: 'mixed',
        staticWordLevels: FEELINGS_STATES_WORD_LEVELS,
      },
      {
        id: 'education_learning',
        name: 'Education & Learning',
        emoji: '🎓',
        labelKey: 'category.educationLearning',
        description: 'Learners, lessons, school materials, school life, learning actions, language learning, math and science basics, tests, progress, education systems, higher education, and learning methods.',
        language: 'English',
        group: 'People & Society',
        public: true,
        default_part_of_speech: 'mixed',
        staticWordLevels: EDUCATION_LEARNING_WORD_LEVELS,
      },
    ],
  },
  {
    label: 'Culture & Leisure',
    groupKey: 'category.group.cultureLeisure',
    emoji: '🎭',
    categories: [
      {
        id: 'sports_hobbies',
        name: 'Sports & Hobbies',
        emoji: '🏀',
        labelKey: 'category.sportsHobbies',
        description: 'Common sports, exercise activities, outdoor activities, team sports, combat sports, water and adventure sports, sports equipment, creative hobbies, music and performance hobbies, games, and leisure activities.',
        language: 'English',
        group: 'Culture & Leisure',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: SPORTS_HOBBIES_WORD_LEVELS,
      },
      {
        id: 'music_instruments',
        name: 'Music & Instruments',
        emoji: '🎵',
        labelKey: 'category.musicInstruments',
        description: 'Common instruments, singing and performance vocabulary, percussion, string instruments, wind and brass instruments, music theory basics, recording and audio vocabulary, ensembles, events, and music genres.',
        language: 'English',
        group: 'Culture & Leisure',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: MUSIC_INSTRUMENT_WORD_LEVELS,
      },
      {
        id: 'arts_entertainment',
        name: 'Arts & Entertainment',
        emoji: '🎨',
        labelKey: 'category.artsEntertainment',
        description: 'Art basics, supplies, crafts, visual arts, theater and stage vocabulary, film and story vocabulary, books, comics, games, puzzles, video games, shows, events, and advanced art and entertainment vocabulary.',
        language: 'English',
        group: 'Culture & Leisure',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: ARTS_ENTERTAINMENT_WORD_LEVELS,
      },
    ],
  },
  {
    label: 'Modern Life',
    groupKey: 'category.group.modernLife',
    emoji: '💻',
    categories: [
      {
        id: 'technology_media',
        name: 'Technology & Media',
        emoji: '📱',
        labelKey: 'category.technologyMedia',
        description: 'Common devices, computer hardware, internet vocabulary, apps and software, messaging, social media, photos and video, media content, data, storage, security, and advanced modern technology vocabulary.',
        language: 'English',
        group: 'Modern Life',
        public: true,
        default_part_of_speech: 'noun',
        staticWordLevels: TECHNOLOGY_MEDIA_WORD_LEVELS,
      },
      {
        id: 'money_shopping_services',
        name: 'Money, Shopping & Services',
        emoji: '💳',
        labelKey: 'category.moneyShoppingServices',
        description: 'Everyday money vocabulary, payment, prices, deals, shopping objects, checkout vocabulary, banking basics, online shopping, services, household bills, business money, and advanced financial vocabulary.',
        language: 'English',
        group: 'Modern Life',
        public: true,
        default_part_of_speech: 'mixed',
        staticWordLevels: MONEY_SHOPPING_SERVICES_WORD_LEVELS,
      },
    ],
  },
  {
    label: 'Language Building',
    groupKey: 'category.group.languageBuilding',
    emoji: '📚',
    categories: [
      { name: 'Verbs (Actions)', emoji: '🏃', labelKey: 'category.verbs' },
      { name: 'Adjectives (Descriptions)', emoji: '🎨', labelKey: 'category.adjectives' },
      { id: 'nouns', name: 'Nouns (Things)', emoji: '📦', labelKey: 'category.nouns', public: false },
      { name: 'Idioms & Expressions', emoji: '💬', labelKey: 'category.idioms' },
    ],
  },
  {
    label: 'Real Talk',
    groupKey: 'category.group.realTalk',
    emoji: '🍻',
    categories: [
      { name: 'Slang & Street Language', emoji: '🔥', labelKey: 'category.slangStreet' },
      { name: 'Romantic & Flirting', emoji: '💕', labelKey: 'category.romanticFlirting' },
      { name: 'Drinking & Nightlife', emoji: '🍸', labelKey: 'category.drinkingNightlife' },
      { name: 'Texting & Internet', emoji: '📱', labelKey: 'category.textingInternet' },
      { name: 'Playful Insults', emoji: '😜', labelKey: 'category.playfulInsults' },
      { name: 'Taboo & Swearing', emoji: '🤬', labelKey: 'category.tabooSwearing' },
    ],
  },
  {
    label: 'Cultural',
    groupKey: 'category.group.cultural',
    emoji: '🦉',
    categories: [
      { name: 'Proverbs & Wisdom', emoji: '🦉', labelKey: 'category.proverbs' },
      { name: 'Untranslatable Words', emoji: '🌟', labelKey: 'category.untranslatable' },
      { name: 'Philosophical Concepts', emoji: '🧘', labelKey: 'category.philosophical' },
      { name: 'Poetic & Literary', emoji: '📜', labelKey: 'category.poetic' },
      { name: 'Humor & Wordplay', emoji: '😂', labelKey: 'category.humorWordplay' },
    ],
  },
  {
    label: 'Fun & Unique',
    groupKey: 'category.group.funUnique',
    emoji: '🎪',
    categories: [
      { name: 'Tongue Twisters', emoji: '👅', labelKey: 'category.tongueTwisters' },
      { name: 'Onomatopoeia (Sound Words)', emoji: '💥', labelKey: 'category.onomatopoeia' },
      { name: 'Famous Quotes', emoji: '✨', labelKey: 'category.famousQuotes' },
      { name: 'Compliments & Flattery', emoji: '💐', labelKey: 'category.compliments' },
    ],
  },
  {
    label: 'Practical',
    groupKey: 'category.group.practical',
    emoji: '🧰',
    categories: [
      { name: 'Negotiation & Haggling', emoji: '🤝', labelKey: 'category.negotiation' },
      { name: 'Emergencies', emoji: '🚨', labelKey: 'category.emergencies' },
      { name: 'Complaining & Frustration', emoji: '😤', labelKey: 'category.complaining' },
      { name: 'Emotional Nuance', emoji: '🎭', labelKey: 'category.emotionalNuance' },
    ],
  },
]

// Free-floating categories rendered outside CATEGORY_GROUPS. Random Mix lives
// at the bottom of the picker rather than under a one-entry "Surprise Me"
// group header.
export const PINNED_BOTTOM_CATEGORIES: Category[] = [
  { name: 'Random Mix', emoji: '🎲', labelKey: 'category.randomMix', pinned: 'bottom' },
]

export function getPublicCategoryGroups(): CategoryGroup[] {
  return CATEGORY_GROUPS
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) => category.public !== false),
    }))
    .filter((group) => group.categories.length > 0)
}

export function getThematicDuplicateReport(): ThematicDuplicateReport {
  return THEMATIC_DUPLICATE_REPORT
}

export function getStaticCategoryVocabularyItems(category: Category, levelNumber?: number): StaticCategoryVocabularyItem[] {
  const items: StaticCategoryVocabularyItem[] = []
  const usedIds = new Map<string, number>()
  const categoryId = category.id ?? slugifyConceptId(category.name)
  const levels = levelNumber === undefined
    ? category.staticWordLevels ?? []
    : category.staticWordLevels?.filter((level) => level.level === levelNumber) ?? []

  for (const level of levels) {
    level.words.forEach((entry, index) => {
      const word = getCategoryEntryWord(entry).trim()
      const baseId = `${categoryId}.${slugifyConceptId(word)}`
      const seen = usedIds.get(baseId) ?? 0
      usedIds.set(baseId, seen + 1)
      const id = typeof entry === 'object' && entry.id
        ? entry.id
        : seen === 0
          ? baseId
          : `${baseId}_${seen + 1}`
      const translations = resolveStaticCategoryTranslations(id, word)

      items.push({
        ...(typeof entry === 'object' ? entry : {}),
        id,
        categoryId,
        word,
        level: typeof entry === 'object' && entry.level ? entry.level : level.level,
        order: typeof entry === 'object' && entry.order ? entry.order : index + 1,
        part_of_speech: typeof entry === 'object' && entry.part_of_speech
          ? entry.part_of_speech
          : category.default_part_of_speech && category.default_part_of_speech !== 'mixed'
            ? category.default_part_of_speech
            : 'noun',
        sense: typeof entry === 'object' && entry.sense ? entry.sense : categoryId,
        translations,
      })
    })
  }

  return items
}

export function getStaticCategoryWords(
  category: Category,
  requestedCount: number,
  levelNumber?: number,
  targetLanguage?: string | null,
): string[] {
  return getStaticCategorySelectedItems(
    category,
    requestedCount,
    levelNumber,
    targetLanguage,
    targetLanguage,
  ).map((item) => item.targetTerm)
}

export function getStaticCategorySelectedItems(
  category: Category,
  requestedCount: number,
  levelNumber?: number,
  targetLanguage?: string | null,
  helperLanguage?: string | null,
  options: StaticCategorySelectionOptions = {},
): SelectedCategoryVocabularyItem[] {
  const selectedItems: SelectedCategoryVocabularyItem[] = []
  const seen = new Set<string>()
  const limit = Math.max(0, requestedCount)
  const dedupeTargetTerms = options.dedupeTargetTerms ?? true
  const languageCode = resolveStaticCategoryTargetLanguageCode(targetLanguage)
  const helperLanguageCode = resolveStaticCategoryTargetLanguageCode(helperLanguage)
  const targetLanguageName = STATIC_CATEGORY_TRANSLATION_LANGUAGES.find((language) => language.code === languageCode)?.value ?? 'English'
  const helperLanguageName = STATIC_CATEGORY_TRANSLATION_LANGUAGES.find((language) => language.code === helperLanguageCode)?.value ?? 'English'

  for (const item of getStaticCategoryVocabularyItems(category, levelNumber)) {
    const trimmed = resolveTranslatedTerm(item, languageCode)
    const normalized = normalizeStaticWord(trimmed)
    if (dedupeTargetTerms && seen.has(normalized)) continue

    selectedItems.push({
      conceptId: item.id,
      itemId: item.id,
      categoryId: item.categoryId,
      level: item.level,
      order: item.order,
      part_of_speech: item.part_of_speech,
      sense: item.sense,
      targetLanguage: languageCode,
      targetLanguageName,
      targetTerm: trimmed,
      helperLanguage: helperLanguageCode,
      helperLanguageName,
      helperTerm: resolveTranslatedTerm(item, helperLanguageCode),
      translations: item.translations,
    })
    if (dedupeTargetTerms) seen.add(normalized)
    if (selectedItems.length >= limit) return selectedItems
  }

  return selectedItems
}

export function formatSelectedCategoryVocabularyLabel(item: SelectedCategoryVocabularyItem): string {
  return item.helperTerm && normalizeStaticWord(item.helperTerm) !== normalizeStaticWord(item.targetTerm)
    ? `${item.targetTerm} / ${item.helperTerm}`
    : item.targetTerm
}

export function resolveStaticCategoryTargetLanguageCode(language?: string | null): StaticCategoryTargetLanguageCode {
  const normalized = (language ?? '').trim().toLowerCase()
  return STATIC_CATEGORY_TRANSLATION_LANGUAGES.find((entry) => (
    entry.code === normalized
    || entry.value.toLowerCase() === normalized
    || entry.label.toLowerCase() === normalized
    || entry.name.toLowerCase() === normalized
    || entry.nativeName.toLowerCase() === normalized
    || (entry.code === 'ceb' && normalized === 'cebuano')
  ))?.code ?? 'en'
}

function getCategoryEntryWord(entry: string | CategoryWordEntry): string {
  return typeof entry === 'string' ? entry : entry.word
}

function normalizeStaticWord(word: string): string {
  return word.trim().normalize('NFC').toLowerCase()
}

function resolveTranslatedTerm(
  item: StaticCategoryVocabularyItem,
  languageCode: StaticCategoryTargetLanguageCode,
): string {
  return (item.translations[languageCode]?.term ?? item.translations.en.term).trim()
}

function resolveStaticCategoryTranslations(id: string, fallbackEnglishTerm: string): StaticCategoryTranslations {
  const translated = STATIC_CATEGORY_TRANSLATIONS[id as keyof typeof STATIC_CATEGORY_TRANSLATIONS] as
    | Partial<Record<StaticCategoryTargetLanguageCode, StaticCategoryTranslation>>
    | undefined

  return Object.fromEntries(
    STATIC_CATEGORY_TRANSLATION_LANGUAGES.map(({ code }) => {
      const translation = translated?.[code]
      return [
        code,
        {
          term: translation?.term ?? fallbackEnglishTerm,
          ...(!translation ? { isFallback: true } : {}),
          ...(translation?.needsReview ? { needsReview: true } : {}),
          ...(translation?.reviewNote ? { reviewNote: translation.reviewNote } : {}),
        },
      ]
    }),
  ) as StaticCategoryTranslations
}

function slugifyConceptId(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'item'
}
