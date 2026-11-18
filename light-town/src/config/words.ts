const RAW_WORDS = `add, sad, dad, lad, all, fall, flag, glad, glass, had, has, hall, half, ask, red, rug, hug, jug, run, sun, fun, fur, rush, dish, fish, hill, girl, ride, deer, seed, feed, fire, sail, leaf, lake, like, wish, wood, wool, owl, dog, good, door, food, frog, gold, glow, slow, snow, pool, apple, pear, purple, quiet, queen, tree, toy, yellow, day, play, star, sky, light, night, town, home, moon, room, bird, blue, green, bread, boat, book, milk, warm, window, cat, cup, cake, cloud, cow, fox, box, six, zoo, zip, zebra, cozy`;

/** The fixed word bank, de-duplicated in original order. */
export const WORDS: readonly string[] = [
  ...new Set(
    RAW_WORDS.split(',')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => /^[a-z]+$/.test(w)),
  ),
];
