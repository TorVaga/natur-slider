const imageLibrary = getImageLibrary();
const comparison = createPhotoChangeSlider({
  mount: "#comparison",
  before: imageLibrary[0],
  after: imageLibrary[1] ?? imageLibrary[0],
  initialPosition: 50,
  onChange: (position) => {
    document.querySelector("#positionOutput").value = `${Math.round(position)}%`;
  },
});

setupImagePicker(imageLibrary, comparison);
setupFindings();

function getImageLibrary() {
  const fallback = [
    {
      year: "1949",
      src: "./assets/1949.svg",
      alt: "Naturfoto fra 1949",
    },
    {
      year: "1995",
      src: "./assets/1995.svg",
      alt: "Naturfoto fra 1995",
    },
    {
      year: "2016",
      src: "./assets/2016.svg",
      alt: "Naturfoto fra 2016",
    },
    {
      year: "2026",
      src: "./assets/2026.svg",
      alt: "Naturfoto fra 2026",
    },
  ];

  const source = Array.isArray(window.NATUR_SLIDER_IMAGES)
    ? window.NATUR_SLIDER_IMAGES
    : fallback;

  const images = source
    .map((image, index) => normalizeImage(image, index))
    .filter(Boolean);

  return images.length > 0 ? images : fallback.map(normalizeImage);
}

function normalizeImage(image, index) {
  if (!image?.src) {
    return null;
  }

  const year = String(image.year ?? image.label ?? `Bilde ${index + 1}`);

  return {
    year,
    label: year,
    src: image.src,
    alt: image.alt ?? `Naturfoto fra ${year}`,
  };
}

function setupImagePicker(images, slider) {
  const beforeSelect = document.querySelector("#beforeSelect");
  const afterSelect = document.querySelector("#afterSelect");
  const beforeLabel = document.querySelector("#beforeYearLabel");
  const afterLabel = document.querySelector("#afterYearLabel");
  const swapButton = document.querySelector("#swapButton");
  const resetButton = document.querySelector("#resetButton");

  fillSelect(beforeSelect, images);
  fillSelect(afterSelect, images);
  beforeSelect.selectedIndex = Math.max(0, images.length - 2);
  afterSelect.selectedIndex = Math.max(0, images.length - 1);

  beforeSelect.addEventListener("change", updateComparison);
  afterSelect.addEventListener("change", updateComparison);

  swapButton.addEventListener("click", () => {
    const beforeIndex = beforeSelect.selectedIndex;
    beforeSelect.selectedIndex = afterSelect.selectedIndex;
    afterSelect.selectedIndex = beforeIndex;
    updateComparison();
  });

  resetButton.addEventListener("click", () => {
    slider.setPosition(50);
  });

  updateComparison();

  function updateComparison() {
    const before = images[beforeSelect.selectedIndex] ?? images[0];
    const after = images[afterSelect.selectedIndex] ?? images[0];

    slider.updateImages(before, after);
    beforeLabel.textContent = before.year;
    afterLabel.textContent = after.year;
  }
}

function fillSelect(select, images) {
  const options = images.map((image, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = image.year;
    return option;
  });

  select.replaceChildren(...options);
}

function createPhotoChangeSlider({
  mount,
  before,
  after,
  initialPosition = 50,
  onChange = () => {},
}) {
  const root = typeof mount === "string" ? document.querySelector(mount) : mount;

  if (!root) {
    throw new Error("Fant ikke elementet slideren skal monteres i.");
  }

  let topImage = { ...before };
  let underImage = { ...after };

  root.className = "compare";
  root.setAttribute("aria-label", "Sammenligning av to naturfoto");

  const under = imageElement("compare__image compare__under", underImage);
  const over = imageElement("compare__image compare__over", topImage);
  const shade = document.createElement("div");
  shade.className = "compare__shade";

  const leftLabel = document.createElement("span");
  leftLabel.className = "compare__label compare__label--left";
  leftLabel.textContent = topImage.label;

  const rightLabel = document.createElement("span");
  rightLabel.className = "compare__label compare__label--right";
  rightLabel.textContent = underImage.label;

  const handle = document.createElement("div");
  handle.className = "compare__handle";

  const grip = document.createElement("span");
  grip.className = "compare__grip";
  handle.append(grip);

  const range = document.createElement("input");
  range.className = "compare__range";
  range.type = "range";
  range.min = "0";
  range.max = "100";
  range.step = "0.1";
  range.value = String(initialPosition);
  range.setAttribute("aria-label", "Vis mer eller mindre av bildet til venstre");

  root.replaceChildren(under, over, shade, leftLabel, rightLabel, handle, range);

  range.addEventListener("input", () => setPosition(Number(range.value)));

  function setPosition(value) {
    const safeValue = Math.min(100, Math.max(0, Number(value)));
    range.value = String(safeValue);
    root.style.setProperty("--reveal", `${safeValue}%`);
    onChange(safeValue);
  }

  function swap() {
    [topImage, underImage] = [underImage, topImage];
    applyImage(over, topImage);
    applyImage(under, underImage);
    leftLabel.textContent = topImage.label;
    rightLabel.textContent = underImage.label;
    setPosition(50);
  }

  function updateImages(nextTopImage, nextUnderImage) {
    topImage = { ...nextTopImage };
    underImage = { ...nextUnderImage };
    applyImage(over, topImage);
    applyImage(under, underImage);
    leftLabel.textContent = topImage.label;
    rightLabel.textContent = underImage.label;
    setPosition(Number(range.value));
  }

  setPosition(initialPosition);

  return {
    setPosition,
    swap,
    updateImages,
  };
}

function imageElement(className, image) {
  const img = document.createElement("img");
  img.className = className;
  applyImage(img, image);
  return img;
}

function applyImage(img, image) {
  img.src = image.src;
  img.alt = image.alt;
  img.draggable = false;
}

function setupFindings() {
  const storageKey = "natur-slider-funn";
  const selectedTags = new Set();
  const tagButtons = [...document.querySelectorAll("[data-tag]")];
  const note = document.querySelector("#observationInput");
  const addButton = document.querySelector("#addFindingButton");
  const clearButton = document.querySelector("#clearFindingsButton");
  const list = document.querySelector("#findingList");
  let findings = loadFindings();

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.tag;

      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        button.classList.remove("is-selected");
      } else {
        selectedTags.add(tag);
        button.classList.add("is-selected");
      }
    });
  });

  addButton.addEventListener("click", () => {
    const text = note.value.trim();

    if (!text && selectedTags.size === 0) {
      note.focus();
      return;
    }

    findings = [
      {
        tags: [...selectedTags],
        text,
      },
      ...findings,
    ];

    note.value = "";
    selectedTags.clear();
    tagButtons.forEach((button) => button.classList.remove("is-selected"));
    saveFindings();
    renderFindings();
  });

  clearButton.addEventListener("click", () => {
    findings = [];
    saveFindings();
    renderFindings();
  });

  renderFindings();

  function renderFindings() {
    list.replaceChildren();

    if (findings.length === 0) {
      const empty = document.createElement("p");
      empty.className = "finding-empty";
      empty.textContent = "Ingen funn er lagt til ennå.";
      list.append(empty);
      return;
    }

    findings.forEach((finding) => {
      const item = document.createElement("article");
      item.className = "finding";

      if (finding.tags.length > 0) {
        const tags = document.createElement("div");
        tags.className = "finding__tags";

        finding.tags.forEach((tag) => {
          const chip = document.createElement("span");
          chip.className = "finding__tag";
          chip.textContent = tag;
          tags.append(chip);
        });

        item.append(tags);
      }

      if (finding.text) {
        const text = document.createElement("p");
        text.className = "finding__note";
        text.textContent = finding.text;
        item.append(text);
      }

      list.append(item);
    });
  }

  function loadFindings() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) ?? [];
    } catch {
      return [];
    }
  }

  function saveFindings() {
    localStorage.setItem(storageKey, JSON.stringify(findings));
  }
}
