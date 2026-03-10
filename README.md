# 🔍 CSS Klašu Meklētājs

Divi rīki CSS klašu atrašanai, kurās atrodas konkrēts teksts.

---

## 🎯 Izvēlies risinājumu:

### ⚡ [Chrome Extension](extension/) - **IETEICAMS!**

**Priekšrocības:**
- ✅ **Nav CORS problēmu** - strādā tieši lapā
- ✅ **Hover režīms** - uzbrauc ar peli un redzi klases
- ✅ **Meklēšanas režīms** - atrod un izceļ tekstus
- ✅ **Strādā uz JEBKURAS lapas**
- ✅ **Vienkārši instalēt** - 2 minūtes

**Kā instalēt:**
1. Atver `chrome://extensions/`
2. Ieslēdz **Developer mode**
3. Noklikšķini **"Load unpacked"**
4. Izvēlies `extension` mapi
5. ✅ Gatavs!

[📖 Detalizētas instrukcijas →](extension/README.md)

---

### 🌐 [Web Aplikācija](index.html)

**Kad izmantot:**
- Ja nevēlies instalēt extension
- Ja vēlies analizēt HTML kodu bez pārlūkprogrammas
- Ja strādā ar lokāliem failiem

**Funkcijas:**
- 3 metodes: URL, HTML kods, faila augšupielāde
- CORS proxy atbalsts
- Vienkārša saskarne

**Kā izmantot:**
Vienkārši atver `index.html` pārlūkprogrammā!

---

## 📊 Salīdzinājums

| Funkcija | Chrome Extension | Web App |
|----------|------------------|---------|
| Hover režīms | ✅ | ❌ |
| Bez CORS problēmām | ✅ | ❌* |
| Strādā uz live lapām | ✅ | ⚠️ |
| HTML koda analīze | ✅ | ✅ |
| Instalācija nepieciešama | ✅ | ❌ |

*Web aplikācijai vajag CORS proxy vai manuālu HTML ievadi

---

## 🎨 Kā tas strādā

Abi rīki:
- Meklē tekstu HTML dokumentā
- Atrod CSS klases, kurās teksts atrodas
- **Parāda tikai augstāko (topmost) vecāku klasi**, ja teksts ir nested elementos

Piemēram:
```html
<div class="container">
  <div class="card">
    <p class="text">Hello World</p>
  </div>
</div>
```

Meklējot "Hello World", rīks parādīs `container` (augstākā vecāku klase).

---

## 🚀 Ātrā sākšana

**Ieteicams ceļš:**

1. Sāc ar **Chrome Extension** (vienkāršākais un jaudīgākais)
2. Ja vajag analizēt HTML kodu ārpus pārlūkprogrammas, izmanto **Web App**

**Izvēlies extension, ja:**
- Vēlies ātri pārbaudīt klases uz jebkuras lapas
- Patīk hover funkcionalitāte
- Nepatīk CORS problēmas

**Izvēlies web app, ja:**
- Nevēlies instalēt extension
- Strādā ar lejupielādētiem HTML failiem
- Vajag analizēt HTML kodu bez pārlūkprogrammas

---

## 📝 Licence

Brīva izmantošanai (Open Source)
