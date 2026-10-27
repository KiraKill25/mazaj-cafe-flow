import { describe, it, expect } from "vitest";
import { MENU_ITEMS, MENU_CATEGORIES, MENU_IMAGES } from "@/lib/menu";
const find = (fr: string) => MENU_ITEMS.find((i) => i.name.fr === fr)!;
describe("Mazaj menu", () => {
  it("has 6 categories", () => expect(MENU_CATEGORIES).toHaveLength(6));
  it("every item has a photo", () => MENU_ITEMS.forEach((i) => expect(MENU_IMAGES[i.image.slice(5)]).toBeTruthy()));
  it("brunch sizes are separate", () => {
    expect(find("Brunch turc (2 pers)").price).toBe(2500);
    expect(find("Brunch turc (4 pers)").price).toBe(4500);
    expect(find("Brunch Mazaj (2 pers)").price).toBe(3000);
    expect(find("Brunch Mazaj (4 pers)").price).toBe(5500);
  });
  it("omelegg arabic name", () => expect(find("Omelegg").name.ar).toBe("اومليڨ"));
});
