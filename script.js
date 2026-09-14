const KEYS = {
  readings: "tarot-journal-readings-v1",
  draft: "tarot-journal-draft-v1",
  theme: "tarot-journal-theme-v1"
};

let deck = [];
let readings = JSON.parse(localStorage.getItem(KEYS.readings)) || [];
let currentReading = null;

const $ = id => document.getElementById(id);

const sageLeafSVG = `
  <svg viewBox="0 0 100 140" aria-hidden="true">
    <path class="leaf-shape" d="M50 17
      C34 22 24 34 23 49
      C14 59 19 70 26 75
      C21 88 30 98 40 101
      C44 110 48 118 50 126
      C52 118 56 110 60 101
      C70 98 79 88 74 75
      C81 70 86 59 77 49
      C76 34 66 22 50 17Z"/>
    <path class="leaf-vein" d="M50 25V119"/>
    <path class="leaf-vein" d="M50 45L34 36M50 58L29 51M50 73L28 69M50 88L35 91"/>
    <path class="leaf-vein" d="M50 45L66 36M50 58L71 51M50 73L72 69M50 88L65 91"/>
  </svg>
`;

async function initialize() {
  populateSpreads();
  bindEvents();
  restoreTheme();

  try {
    deck = await loadTarotDeck();
    $("loadingMessage").textContent = "";
    $("drawButton").disabled = false;
    renderLibrary();
  } catch {
    $("loadingMessage").textContent =
      "The card library could not load. Check your connection and refresh.";
  }

  const draft = JSON.parse(localStorage.getItem(KEYS.draft));

  if (draft?.cards?.length) {
    currentReading = draft;
    showReading();
  }

  renderJournal();
  renderInsights();
}

function populateSpreads() {
  Object.entries(SPREADS).forEach(([key, spread]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${spread.name} · ${spread.positions.length || "Custom"} card${
      spread.positions.length === 1 ? "" : "s"
    }`;

    $("spreadSelect").appendChild(option);

    if (key !== "custom") {
      const filter = document.createElement("option");
      filter.value = key;
      filter.textContent = spread.name;
      $("journalSpreadFilter").appendChild(filter);
    }
  });

  updateSpreadDescription();
}

function bindEvents() {
  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  $("spreadSelect").addEventListener("change", updateSpreadDescription);
  $("drawButton").addEventListener("click", beginShuffle);
  $("restartButton").addEventListener("click", restartReading);
  $("saveReadingButton").addEventListener("click", saveReading);
  $("clarifierButton").addEventListener("click", addClarifier);
  $("themeButton").addEventListener("click", toggleTheme);

  ["overallReflection", "moodAfter", "followUpDate", "readingIntention"].forEach(id => {
    $(id).addEventListener("input", updateClosingFields);
  });

  $("journalSearch").addEventListener("input", renderJournal);
  $("journalSpreadFilter").addEventListener("change", renderJournal);
  $("favoritesOnly").addEventListener("change", renderJournal);
  $("librarySearch").addEventListener("input", renderLibrary);
  $("exportButton").addEventListener("click", exportJournal);
  $("importInput").addEventListener("change", importJournal);
}

function updateSpreadDescription() {
  const key = $("spreadSelect").value;
  $("spreadDescription").textContent = SPREADS[key].description;
  $("customSpreadOptions").classList.toggle("hidden", key !== "custom");
}

function getPositions() {
  const key = $("spreadSelect").value;

  if (key !== "custom") return [...SPREADS[key].positions];

  const count = Math.min(10, Math.max(1, Number($("customCount").value) || 3));
  const labels = $("customLabels").value
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  return Array.from(
    { length: count },
    (_, index) => labels[index] || `Card ${index + 1}`
  );
}

function beginShuffle() {
  if (!deck.length) return;

  $("setupPanel").classList.add("hidden");
  $("shuffleOverlay").classList.remove("hidden");

  window.setTimeout(() => {
    createReading();
    $("shuffleOverlay").classList.add("hidden");
    showReading();
  }, 1900);
}

function createReading() {
  const spreadKey = $("spreadSelect").value;
  const positions = getPositions();
  const allowReversals = $("reversalsToggle").checked;
  const daily = spreadKey === "daily";

  const chosen = daily
    ? [deck[hashString(localDateKey()) % deck.length]]
    : shuffle([...deck]).slice(0, positions.length);

  currentReading = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    spreadKey,
    spreadName: SPREADS[spreadKey].name,
    question: $("readingQuestion").value.trim(),
    moodBefore: $("moodBefore").value,
    tags: $("readingTags").value
      .split(",")
      .map(value => value.trim())
      .filter(Boolean),
    allowReversals,
    favorite: false,
    cards: chosen.map((card, index) => ({
      card,
      position: positions[index],
      reversed: allowReversals
        ? daily
          ? hashString(`${localDateKey()}-reversed`) % 2 === 0
          : Math.random() < 0.5
        : false,
      revealed: false,
      reflection: "",
      clarifier: false
    })),
    overallReflection: "",
    moodAfter: "",
    intention: "",
    followUpDate: ""
  };

  saveDraft();
}

function showReading() {
  $("setupPanel").classList.add("hidden");
  $("readingPanel").classList.remove("hidden");

  $("readingSpreadName").textContent = currentReading.spreadName;
  $("readingTitle").textContent =
    currentReading.question || `${currentReading.spreadName} Reflection`;

  $("readingQuestionDisplay").textContent =
    currentReading.question ? `“${currentReading.question}”` : "A general reading";

  $("overallReflection").value = currentReading.overallReflection || "";
  $("moodAfter").value = currentReading.moodAfter || "";
  $("readingIntention").value = currentReading.intention || "";
  $("followUpDate").value = currentReading.followUpDate || "";

  $("clarifierButton").disabled =
    currentReading.cards.some(item => item.clarifier);

  renderReadingCards();
}

function renderReadingCards() {
  const area = $("cardsArea");
  area.innerHTML = "";

  currentReading.cards.forEach((item, index) => {
    const wrapper = document.createElement("article");
    wrapper.className = `reading-card ${item.revealed ? "revealed" : ""}`;
    wrapper.style.animationDelay = `${index * 0.14}s`;

    wrapper.innerHTML = `
      <div class="position-label">
        ${escapeHTML(item.clarifier ? "Clarifying card" : item.position)}
      </div>

      <div class="tarot-card ${item.revealed ? "revealed" : ""}">
        <div class="tarot-card-inner">
          <div class="tarot-face tarot-back">
            ${sageLeafSVG}
          </div>

          <div class="tarot-face tarot-front ${item.reversed ? "reversed" : ""}">
            <img src="${cardImage(item.card)}" alt="${escapeHTML(item.card.name)}">
            <div class="image-fallback hidden">${escapeHTML(item.card.name)}</div>
          </div>
        </div>
      </div>

      <p class="reveal-hint">Click the card to reveal it</p>

      <div class="card-details">
        <span class="orientation">${item.reversed ? "Reversed" : "Upright"}</span>
        <h3>${escapeHTML(item.card.name)}</h3>

        <p class="keywords">
          ${cardKeywords(item.card, item.reversed).join(" · ")}
        </p>

        <p class="meaning">
          ${escapeHTML(cardMeaning(item.card, item.reversed))}
        </p>

        <div class="position-meaning">
          <strong>What this card means here</strong>
          <p>
            ${escapeHTML(
              positionInterpretation(item.card, item.reversed, item.position)
            )}
          </p>
        </div>

        <details>
          <summary>Explore the imagery</summary>
          <p class="symbolism">
            ${escapeHTML(
              item.card.desc ||
              "Notice which details in the image draw your attention."
            )}
          </p>
        </details>

        <p class="reflection-prompt">
          ${escapeHTML(reflectionPrompt(index, currentReading.cards.length))}
        </p>

        <label>
          Your reflection
          <textarea
            class="card-reflection"
            rows="4"
            placeholder="What does this card bring up for you?"
          >${escapeHTML(item.reflection || "")}</textarea>
        </label>
      </div>
    `;

    const image = wrapper.querySelector("img");

    image.addEventListener("error", () => {
      image.classList.add("hidden");
      wrapper.querySelector(".image-fallback").classList.remove("hidden");
    });

    wrapper.querySelector(".tarot-card").addEventListener("click", () => {
      if (item.revealed) return;

      item.revealed = true;
      wrapper.classList.add("revealed");
      wrapper.querySelector(".tarot-card").classList.add("revealed");
      saveDraft();

      window.setTimeout(() => {
        wrapper.querySelector(".card-details").style.display = "block";
      }, 450);
    });

    wrapper.querySelector(".card-reflection").addEventListener("input", event => {
      item.reflection = event.target.value;
      saveDraft();
    });

    area.appendChild(wrapper);
  });
}

function addClarifier() {
  const used = new Set(currentReading.cards.map(item => item.card.name));
  const available = deck.filter(card => !used.has(card.name));
  const card = available[Math.floor(Math.random() * available.length)];

  currentReading.cards.push({
    card,
    position: "Clarification",
    reversed: currentReading.allowReversals && Math.random() < 0.5,
    revealed: false,
    reflection: "",
    clarifier: true
  });

  saveDraft();
  showReading();
}

function updateClosingFields() {
  if (!currentReading) return;

  currentReading.overallReflection = $("overallReflection").value;
  currentReading.moodAfter = $("moodAfter").value;
  currentReading.intention = $("readingIntention").value;
  currentReading.followUpDate = $("followUpDate").value;
  saveDraft();
}

function saveDraft() {
  localStorage.setItem(KEYS.draft, JSON.stringify(currentReading));
}

function saveReading() {
  updateClosingFields();

  const existing = readings.findIndex(item => item.id === currentReading.id);

  if (existing >= 0) readings[existing] = structuredClone(currentReading);
  else readings.unshift(structuredClone(currentReading));

  persistReadings();
  localStorage.removeItem(KEYS.draft);
  currentReading = null;

  resetSetup();
  renderJournal();
  renderInsights();
  switchView("journal");
}

function restartReading() {
  if (!confirm("Start a new reading and clear this unfinished one?")) return;

  currentReading = null;
  localStorage.removeItem(KEYS.draft);
  resetSetup();
}

function resetSetup() {
  $("readingPanel").classList.add("hidden");
  $("shuffleOverlay").classList.add("hidden");
  $("setupPanel").classList.remove("hidden");
  $("readingQuestion").value = "";
  $("readingTags").value = "";
  $("moodBefore").value = "";
}

function renderJournal() {
  const search = $("journalSearch").value.toLowerCase().trim();
  const spread = $("journalSpreadFilter").value;
  const favoritesOnly = $("favoritesOnly").checked;

  const filtered = readings.filter(reading => {
    const searchable = [
      reading.question,
      reading.spreadName,
      ...(reading.tags || []),
      ...reading.cards.map(item => item.card.name)
    ].join(" ").toLowerCase();

    return (
      (!search || searchable.includes(search)) &&
      (!spread || reading.spreadKey === spread) &&
      (!favoritesOnly || reading.favorite)
    );
  });

  $("journalList").innerHTML = filtered.length
    ? ""
    : `<div class="empty">No matching readings yet.</div>`;

  filtered.forEach(reading => {
    const entry = document.createElement("details");
    entry.className = "journal-entry";

    entry.innerHTML = `
      <summary>
        <div class="journal-summary">
          <div>
            <h3>${escapeHTML(reading.question || reading.spreadName)}</h3>
            <div class="entry-meta">
              ${formatDate(reading.createdAt)} · ${escapeHTML(reading.spreadName)}
            </div>
          </div>
          <span>${reading.favorite ? "★" : "☆"}</span>
        </div>
      </summary>

      <div class="entry-cards">
        ${reading.cards.map(item => `
          <span class="card-pill">
            ${escapeHTML(item.position)}: ${escapeHTML(item.card.name)}
            ${item.reversed ? " (Reversed)" : ""}
          </span>
        `).join("")}
      </div>

      ${(reading.tags || []).map(tag =>
        `<span class="tag">${escapeHTML(tag)}</span>`
      ).join(" ")}

      ${reading.cards.map(item => `
        <div class="position-meaning">
          <strong>${escapeHTML(item.position)} · ${escapeHTML(item.card.name)}</strong>
          <p>${escapeHTML(item.reflection || "No reflection recorded.")}</p>
        </div>
      `).join("")}

      <p><strong>Overall reflection:</strong><br>
        ${escapeHTML(reading.overallReflection || "Not recorded.")}
      </p>

      <p><strong>Takeaway or intention:</strong><br>
        ${escapeHTML(reading.intention || "Not recorded.")}
      </p>

      <div class="entry-actions">
        <button class="text-button favorite-button">
          ${reading.favorite ? "Remove favorite" : "Favorite"}
        </button>
        <button class="danger-button delete-reading">Delete</button>
      </div>
    `;

    entry.querySelector(".favorite-button").addEventListener("click", event => {
      event.preventDefault();
      reading.favorite = !reading.favorite;
      persistReadings();
      renderJournal();
    });

    entry.querySelector(".delete-reading").addEventListener("click", event => {
      event.preventDefault();

      if (!confirm("Permanently delete this reading?")) return;

      readings = readings.filter(item => item.id !== reading.id);
      persistReadings();
      renderJournal();
      renderInsights();
    });

    $("journalList").appendChild(entry);
  });
}

function renderLibrary() {
  if (!deck.length) return;

  const search = $("librarySearch").value.toLowerCase().trim();

  const filtered = deck.filter(card =>
    [
      card.name,
      card.suit,
      card.meaning_up,
      card.meaning_rev
    ].join(" ").toLowerCase().includes(search)
  );

  $("libraryGrid").innerHTML = filtered.map(card => `
    <article class="library-card">
      <img
        src="${cardImage(card)}"
        alt="${escapeHTML(card.name)}"
        onerror="this.style.display='none'"
      >

      <details>
        <summary>${escapeHTML(card.name)}</summary>
        <p><strong>Upright:</strong> ${escapeHTML(card.meaning_up)}</p>
        <p><strong>Reversed:</strong> ${escapeHTML(card.meaning_rev)}</p>
        <p><strong>Imagery:</strong> ${escapeHTML(card.desc || "")}</p>
      </details>
    </article>
  `).join("");
}

function renderInsights() {
  const allCards = readings.flatMap(reading => reading.cards);
  const cardCounts = countBy(allCards.map(item => item.card.name));
  const suitCounts = countBy(
    allCards.map(item => item.card.suit || "Major Arcana")
  );

  const commonCards = Object.entries(cardCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);

  const commonSuits = Object.entries(suitCounts)
    .sort((a, b) => b[1] - a[1]);

  $("insightsContent").innerHTML = `
    <div class="insight-grid">
      <div class="insight-card">
        <span class="insight-number">${readings.length}</span>
        <span>saved readings</span>
      </div>

      <div class="insight-card">
        <span class="insight-number">${allCards.length}</span>
        <span>cards drawn</span>
      </div>

      <div class="insight-card">
        <span class="insight-number">
          ${readings.filter(reading => reading.favorite).length}
        </span>
        <span>favorite readings</span>
      </div>
    </div>

    <div class="ranking">
      <h3>Most recurring cards</h3>
      ${
        commonCards.length
          ? commonCards.map(([name, count]) => `
              <div class="rank-row">
                <span>${escapeHTML(name)}</span>
                <strong>${count}</strong>
              </div>
            `).join("")
          : `<div class="empty">Patterns will appear after you save readings.</div>`
      }
    </div>

    <div class="ranking">
      <h3>Suits and arcana</h3>
      ${commonSuits.map(([name, count]) => `
        <div class="rank-row">
          <span>${escapeHTML(name)}</span>
          <strong>${count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function exportJournal() {
  const blob = new Blob(
    [JSON.stringify({
      exportedAt: new Date().toISOString(),
      readings
    }, null, 2)],
    { type: "application/json" }
  );

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `tarot-journal-backup-${localDateKey()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJournal(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);

      if (!Array.isArray(backup.readings)) throw new Error();
      if (!confirm("Replace your current journal with this backup?")) return;

      readings = backup.readings;
      persistReadings();
      renderJournal();
      renderInsights();
    } catch {
      alert("That is not a valid Tarot Reflection Journal backup.");
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

function toggleTheme() {
  document.body.classList.toggle("evening");
  const evening = document.body.classList.contains("evening");
  localStorage.setItem(KEYS.theme, evening ? "evening" : "light");
  $("themeButton").textContent = evening ? "☀" : "☾";
}

function restoreTheme() {
  const evening = localStorage.getItem(KEYS.theme) === "evening";
  document.body.classList.toggle("evening", evening);
  $("themeButton").textContent = evening ? "☀" : "☾";
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
}

function persistReadings() {
  localStorage.setItem(KEYS.readings, JSON.stringify(readings));
}

function countBy(values) {
  return values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const random = Math.floor(Math.random() * (index + 1));
    [items[index], items[random]] = [items[random], items[index]];
  }

  return items;
}

function hashString(value) {
  let hash = 0;

  for (const character of value) {
    hash = ((hash << 5) - hash) + character.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash);
}

function localDateKey() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

initialize();
