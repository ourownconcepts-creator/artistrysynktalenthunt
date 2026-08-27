import type { CategoryGroup, TalentCategory } from "./types";

/**
 * Seed catalogue for the launch competition.
 *
 * These are DATA, not code paths: nothing in the app branches on a specific
 * category or group slug. When the backend is connected this file becomes the
 * seed migration and admins edit the rows — no code change required for future
 * competitions.
 */

interface RawGroup {
  slug: string;
  name: string;
  description: string;
  categories: Array<{ slug: string; name: string; blurb: string; auditionHint: string }>;
}

const RAW_GROUPS: RawGroup[] = [
  {
    slug: "music",
    name: "Music",
    description: "Voices, bars, beats and instruments. The sound of a generation.",
    categories: [
      {
        slug: "singing",
        name: "Singing",
        blurb: "Vocal performance across any genre.",
        auditionHint: "One unedited vocal performance, 60–120 seconds.",
      },
      {
        slug: "rap",
        name: "Rap",
        blurb: "Bars, flow, delivery and presence.",
        auditionHint: "One verse, live or over a beat, 60–120 seconds.",
      },
      {
        slug: "songwriting",
        name: "Songwriting",
        blurb: "Original writing, melody and lyric craft.",
        auditionHint: "One original song plus lyric sheet.",
      },
      {
        slug: "instrumental",
        name: "Instrumental",
        blurb: "Any instrument, any tradition.",
        auditionHint: "One continuous performance, 60–180 seconds.",
      },
      {
        slug: "music-production",
        name: "Music Production",
        blurb: "Beats, arrangement, mixing and sound design.",
        auditionHint: "Two original productions plus a short process note.",
      },
      {
        slug: "dj",
        name: "DJ",
        blurb: "Selection, mixing and crowd control.",
        auditionHint: "A 3-minute mix excerpt, video preferred.",
      },
    ],
  },
  {
    slug: "performance",
    name: "Performance",
    description: "The stage arts — bodies, timing, words and nerve.",
    categories: [
      {
        slug: "dance",
        name: "Dance",
        blurb: "Any style, solo or crew.",
        auditionHint: "One full-body routine, 60–120 seconds.",
      },
      {
        slug: "comedy",
        name: "Comedy",
        blurb: "Stand-up, sketch or character work.",
        auditionHint: "One clean set excerpt, 90–180 seconds.",
      },
      {
        slug: "spoken-word",
        name: "Spoken Word",
        blurb: "Poetry and performance text.",
        auditionHint: "One original piece plus written text.",
      },
      {
        slug: "acting",
        name: "Acting",
        blurb: "Monologue or scene work.",
        auditionHint: "One monologue, 60–120 seconds.",
      },
      {
        slug: "performance-art",
        name: "Performance Art",
        blurb: "Hybrid, experimental and conceptual work.",
        auditionHint: "Documentation of one work plus a concept statement.",
      },
    ],
  },
  {
    slug: "visual-creative",
    name: "Visual / Creative",
    description: "Image makers, stylists and directors of taste.",
    categories: [
      {
        slug: "photography",
        name: "Photography",
        blurb: "Portrait, documentary, editorial, street.",
        auditionHint: "A set of 8–12 images with titles.",
      },
      {
        slug: "visual-art",
        name: "Visual Art",
        blurb: "Painting, drawing, sculpture, mixed media.",
        auditionHint: "5–8 works with medium and dimensions.",
      },
      {
        slug: "fashion",
        name: "Fashion",
        blurb: "Design, styling and construction.",
        auditionHint: "One look book of 6+ images or 3 garments.",
      },
      {
        slug: "makeup",
        name: "Makeup",
        blurb: "Beauty, editorial and SFX.",
        auditionHint: "3 completed looks, before and after.",
      },
      {
        slug: "creative-direction",
        name: "Creative Direction",
        blurb: "Concept, art direction and world building.",
        auditionHint: "One campaign or project case study.",
      },
    ],
  },
  {
    slug: "digital-tech",
    name: "Digital / Tech",
    description: "Screens, code and the new creative tools.",
    categories: [
      {
        slug: "coding",
        name: "Coding",
        blurb: "Software, tools and creative engineering.",
        auditionHint: "One working project plus a 2-minute walkthrough.",
      },
      {
        slug: "gaming",
        name: "Gaming",
        blurb: "Competitive play and gameplay craft.",
        auditionHint: "One gameplay reel, 2–3 minutes.",
      },
      {
        slug: "animation",
        name: "Animation",
        blurb: "2D, 3D, motion and stop frame.",
        auditionHint: "One animation, 30–120 seconds.",
      },
      {
        slug: "content-creation",
        name: "Content Creation",
        blurb: "Short form, storytelling and audience craft.",
        auditionHint: "Three published pieces plus reach notes.",
      },
      {
        slug: "digital-art",
        name: "Digital Art",
        blurb: "Illustration, 3D and generative work.",
        auditionHint: "6–10 works with tools listed.",
      },
    ],
  },
  {
    slug: "other-talent",
    name: "Other Talent",
    description: "Talent that refuses a box. Tell us what you do.",
    categories: [
      {
        slug: "other",
        name: "Other Talent",
        blurb: "Anything extraordinary that doesn't fit above.",
        auditionHint: "One demonstration plus a written description.",
      },
    ],
  },
];

export const CATEGORY_GROUPS: CategoryGroup[] = RAW_GROUPS.map((group, groupIndex) => ({
  id: `grp_${group.slug}`,
  slug: group.slug,
  name: group.name,
  description: group.description,
  sortOrder: groupIndex + 1,
  isActive: true,
  categories: group.categories.map((category, index) => ({
    id: `cat_${category.slug}`,
    groupId: `grp_${group.slug}`,
    slug: category.slug,
    name: category.name,
    blurb: category.blurb,
    auditionHint: category.auditionHint,
    sortOrder: index + 1,
    isActive: true,
  })),
}));

export const ALL_CATEGORIES: TalentCategory[] = CATEGORY_GROUPS.flatMap((g) => g.categories);

export function findCategory(slug: string): TalentCategory | undefined {
  return ALL_CATEGORIES.find((c) => c.slug === slug);
}

export function findGroupBySlug(slug: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.slug === slug);
}

export function findGroupForCategory(categorySlug: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.categories.some((c) => c.slug === categorySlug));
}
