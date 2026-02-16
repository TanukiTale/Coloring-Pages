interface PaletteProps {
  colors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
}

export const Palette = ({ colors, selectedColor, onSelect }: PaletteProps): JSX.Element => (
  <div className="palette" role="toolbar" aria-label="Color palette">
    {colors.map((color) => (
      <button
        key={color}
        aria-label={`Select color ${color}`}
        className={`palette__swatch ${selectedColor === color ? 'is-selected' : ''}`}
        style={{ background: color }}
        onClick={() => onSelect(color)}
      />
    ))}
  </div>
);
