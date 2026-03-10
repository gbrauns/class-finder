# CSS Klašu Meklētājs - Chrome Extension

Chrome paplašinājums ar **click-to-copy** funkcionalitāti CSS klašu iegūšanai.

## ✨ Funkcionalitāte

### 👆 Click režīms
- **Noklikšķini uz jebkura elementa** lapā
- **Automātiski nokopējas** augstākās CSS klases
- Parādās tooltip ar apstiprinājumu
- Elements tiek īslaicīgi izcelts

## 📦 Instalācija

### Ielādēt extension Chrome:

1. Atver Chrome → `chrome://extensions/`
2. Ieslēdz **Developer mode** (slēdzis augšā labajā stūrī)
3. Noklikšķini **"Load unpacked"**
4. Izvēlies `extension` mapi
5. ✅ Gatavs!

## 🚀 Lietošana

### Pamata lietošana:

1. **Atver jebkuru mājas lapu**
2. **ATJAUNO lapu (F5)** - SVARĪGI!
3. **Noklikšķini uz jebkura elementa**
4. CSS klase automātiski nokopējas clipboard
5. **Ielīmē (Ctrl+V / Cmd+V)** kur vajag!

### Vizuālais feedback:

- **Tooltip** parādās pie kursora ar nokopēto klasi
- **Elements tiek izcelts** ar zilu kontūru 2 sekundes
- **"✓ Nokopēts!"** apstiprinājums tooltipā

## 🎨 Kā tas strādā

- **Closest klase**: Ja elements ir vairākos nested elementos ar klasēm, extension nokopē tuvāko (closest) CSS klasi no noklikšķinātā elementa
- **Bez CORS problēmām**: Extension strādā tieši lapā
- **Universāls**: Darbojas uz JEBKURAS lapas internetā
- **Automātiska kopēšana**: Nav jāatceras komandas - vienkārši klikšķini!

## 🛠️ Tehniskā informācija

- **Manifest V3**: Jaunākais Chrome Extension standarts
- **Content Script**: Injectē kodu katrā lapā
- **Permissions**: Tikai `activeTab` un `storage` - minimālas atļaujas
- **Clipboard API**: Izmanto document.execCommand() kopēšanai

## ❓ Bieži uzdotie jautājumi

**Kāpēc nestrādā?**
**ATJAUNO LAPU (F5)** pēc extension instalēšanas! Extension aktivizējas tikai jaunās/atjaunotās lapās.

**Vai noklikšķinot variedz mainīt**
Nē, extension izmanto capture phase un parasti netraucē normālai darbībai. Turiet Ctrl/Cmd, ja vajag novērst default action.

**Vai man vajag maksāt?**
Nē! Extension ir pilnīgi bez maksas.

**Vai vajag publicēt Chrome Web Store?**
Nē, var izmantot lokāli ar Developer Mode.

**Vai citi var izmantot?**
Jā, vienkārši kopē extension mapi. Viņiem arī būs jāieslēdz Developer Mode.

**Vai strādā uz visām lapām?**
Jā! Extension strādā uz jebkuras lapas.

## 🐛 Problēmu risināšana

**Extension nereaģē:**
1. ✅ Pārbaudi, vai extension ir instalēts (`chrome://extensions/`)
2. ✅ **ATJAUNO lapu (F5)** - ĻOTI SVARĪGI!
3. ✅ Atver Developer Tools (F12) → Console
4. ✅ Vajadzētu redzēt: `🔍 CSS Klašu Meklētājs extension loaded!`

**Tooltip neparādās:**
- Pārbaudi, vai noklikšķināji uz elementa AR CSS klasi
- Elementi bez CSS klasēm neko nekopēs

**Kā pārbaudīt, vai extension ir aktīvs:**
- Noklikšķini uz extension ikonas Chrome toolbar
- Ja redzi ⚠️ brīdinājumu → Atjauno lapu (F5)
- Ja brīdinājuma nav → Extension ir aktīvs!
