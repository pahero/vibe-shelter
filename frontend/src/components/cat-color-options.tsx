export const catColorOptions = ["Black", "Black-white", "Ginger", "White", "Tortie", "Tri-colored"];

export function CatColorDatalist() {
  return (
    <datalist id="cat-color-options">
      {catColorOptions.map((color) => (
        <option key={color} value={color} />
      ))}
    </datalist>
  );
}
