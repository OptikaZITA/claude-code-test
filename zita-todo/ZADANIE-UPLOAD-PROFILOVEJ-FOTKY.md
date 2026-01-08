# ZADANIE: Upload profilovej fotky

## Prehľad

Implementácia možnosti nahrať profilovú fotku v Settings. Používateľ si môže zmeniť vlastnú fotku, admin môže meniť fotky všetkým.

---

## 1. PRAVIDLÁ

### Čo môže používateľ meniť
| Údaj | Môže meniť používateľ? | Môže meniť admin? |
|------|------------------------|-------------------|
| Profilová fotka | ✅ Áno | ✅ Áno |
| Meno | ❌ Nie | ✅ Áno |
| Prezývka | ❌ Nie | ✅ Áno |
| Email | ❌ Nie | ✅ Áno |
| Pozícia | ❌ Nie | ✅ Áno |

### Technické limity
| Parameter | Hodnota |
|-----------|---------|
| Max veľkosť súboru | 1 MB |
| Max rozmer po kompresii | 400x400 px |
| Cieľová veľkosť po kompresii | max 500 KB |
| Formáty | JPG, PNG, WEBP |

---

## 2. NOVÁ STRÁNKA: /settings/profile

### URL
```
/settings/profile
```

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Profil                                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Profilová fotka                                    │
│  ┌────────┐                                         │
│  │   DG   │  [Zmeniť fotku]  [Odstrániť]           │
│  └────────┘                                         │
│              ↑                                      │
│         kruhový avatar (aktuálny)                   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Meno                                               │
│  Daniel Grigar                          🔒          │
│                                                     │
│  Prezývka                                           │
│  Dano                                   🔒          │
│                                                     │
│  Email                                              │
│  daniel@firma.sk                        🔒          │
│                                                     │
│  Pozícia                                            │
│  Admin                                  🔒          │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  ℹ️ Pre zmenu osobných údajov kontaktujte admina.   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Prvky
- **Kruhový avatar** - zobrazuje aktuálnu fotku alebo iniciály
- **Tlačidlo "Zmeniť fotku"** - otvorí modal pre upload
- **Tlačidlo "Odstrániť"** - zobrazí sa len ak má používateľ fotku
- **Osobné údaje** - needitovateľné, zobrazené s ikonou zámku 🔒
- **Info text** - vysvetlenie že zmeny robí admin

---

## 3. MODAL: Úprava profilovej fotky

### Stav 1: Výber fotky (ak ešte nie je vybraná)

```
┌─────────────────────────────────────┐
│ Profilová fotka                 [×] │
├─────────────────────────────────────┤
│                                     │
│         ┌──────────┐                │
│        ╱            ╲               │
│       │     DG      │               │
│        ╲            ╱               │
│         └──────────┘                │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   📁 Klikni alebo pretiahni │    │
│  │      súbor sem              │    │
│  │                             │    │
│  │   JPG, PNG, WEBP (max 1MB)  │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│                          [Zrušiť]   │
└─────────────────────────────────────┘
```

### Stav 2: Úprava fotky (po výbere)

```
┌─────────────────────────────────────┐
│ Profilová fotka                 [×] │
├─────────────────────────────────────┤
│                                     │
│         ┌──────────┐                │
│        ╱            ╲               │
│       │   (fotka)   │  ← kruhový    │
│        ╲            ╱     náhľad    │
│         └──────────┘                │
│                                     │
│  Drag na fotke = posun              │
│                                     │
│     [−] ────────●──── [+]           │
│              Zoom                   │
│                                     │
│    [📁 Vybrať inú fotku]            │
│                                     │
├─────────────────────────────────────┤
│            [Zrušiť]  [Uložiť]       │
└─────────────────────────────────────┘
```

### Funkcie editora
- **Kruhový náhľad** - presne ako bude avatar vyzerať v appke
- **Drag** - posúvanie fotky v kruhu (myšou alebo prstom)
- **Zoom slider** - priblíženie/oddialenie
- **Vybrať inú** - možnosť zmeniť súbor

---

## 4. ADMIN: Zmena fotky iným používateľom

### V edit-user-modal.tsx

Pridať sekciu pre avatar:

```
┌─────────────────────────────────────┐
│ Upraviť používateľa             [×] │
├─────────────────────────────────────┤
│                                     │
│  Profilová fotka                    │
│  ┌────────┐                         │
│  │   DG   │  [Zmeniť]  [Odstrániť]  │
│  └────────┘                         │
│                                     │
│  Meno *                             │
│  ┌─────────────────────────────┐    │
│  │ Daniel Grigar               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ... (ostatné polia)                │
│                                     │
└─────────────────────────────────────┘
```

---

## 5. SUPABASE STORAGE

### Bucket konfigurácia

```sql
-- Vytvorenie bucketu
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- RLS politiky
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all avatars"
ON storage.objects FOR ALL
USING (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
```

### Cesta k súborom
```
avatars/{user_id}/avatar.jpg
```

### Public URL
```
https://{supabase_url}/storage/v1/object/public/avatars/{user_id}/avatar.jpg
```

---

## 6. KOMPRESIA OBRÁZKOV

### Knižnica
```bash
npm install browser-image-compression
```

### Použitie

```typescript
import imageCompression from 'browser-image-compression';

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,           // Max 500KB
    maxWidthOrHeight: 400,    // Max 400x400px
    useWebWorker: true,
    fileType: 'image/jpeg',   // Konvertovať na JPEG
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Compression failed:', error);
    throw error;
  }
}
```

---

## 7. KOMPONENTY

### Nové súbory

```
app/(dashboard)/settings/profile/page.tsx    # Nová stránka
components/profile/
  ├── avatar-upload-modal.tsx                # Modal s editorom
  ├── avatar-editor.tsx                      # Kruhový editor (zoom, drag)
  └── profile-info.tsx                       # Zobrazenie osobných údajov
lib/hooks/
  └── use-avatar-upload.ts                   # Hook pre upload a kompresia
```

### Upravené súbory

```
components/users/edit-user-modal.tsx         # Pridať avatar sekciu
components/layout/sidebar.tsx                # Link na /settings/profile
```

---

## 8. API / FUNKCIE

### uploadAvatar

```typescript
async function uploadAvatar(
  userId: string, 
  file: File
): Promise<string> {
  // 1. Komprimovať obrázok
  const compressed = await compressImage(file);
  
  // 2. Upload do Supabase Storage
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, { 
      upsert: true,
      contentType: 'image/jpeg'
    });
  
  if (error) throw error;
  
  // 3. Získať public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);
  
  // 4. Aktualizovať users tabuľku
  await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  
  return publicUrl;
}
```

### deleteAvatar

```typescript
async function deleteAvatar(userId: string): Promise<void> {
  // 1. Zmazať súbor
  const path = `${userId}/avatar.jpg`;
  await supabase.storage
    .from('avatars')
    .remove([path]);
  
  // 2. Vymazať URL z users
  await supabase
    .from('users')
    .update({ avatar_url: null })
    .eq('id', userId);
}
```

---

## 9. AVATAR EDITOR KOMPONENT

### Funkcie
- Zobrazenie obrázka v kruhovom výreze
- Drag na posúvanie (mouse + touch)
- Slider na zoom
- Export orezaného obrázka ako canvas → blob

### Knižnica (voliteľné)
```bash
npm install react-easy-crop
```

Alebo vlastná implementácia s canvas.

### Príklad s react-easy-crop

```typescript
import Cropper from 'react-easy-crop';

function AvatarEditor({ image, onCropComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative w-64 h-64">
      <Cropper
        image={image}
        crop={crop}
        zoom={zoom}
        aspect={1}
        cropShape="round"
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
      />
      
      <input
        type="range"
        min={1}
        max={3}
        step={0.1}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
      />
    </div>
  );
}
```

---

## 10. ACCEPTANCE CRITERIA

### Používateľ
- [ ] Vidí stránku /settings/profile s osobnými údajmi
- [ ] Osobné údaje sú needitovateľné (len čítanie)
- [ ] Môže nahrať profilovú fotku
- [ ] Vidí kruhový náhľad pred uložením
- [ ] Môže posúvať a zoomovať fotku
- [ ] Môže odstrániť existujúcu fotku
- [ ] Fotka sa zobrazí v celej appke (sidebar, tasky, kanban)

### Admin
- [ ] Môže meniť fotky iným používateľom v edit-user-modal
- [ ] Môže odstrániť fotky iným používateľom

### Technické
- [ ] Obrázky sú komprimované na max 500KB
- [ ] Obrázky sú uložené v Supabase Storage
- [ ] Public URL pre rýchle načítanie
- [ ] Funguje drag & drop upload
- [ ] Funguje klik pre výber súboru
- [ ] Validácia formátu (JPG, PNG, WEBP)
- [ ] Validácia veľkosti (max 1MB pred kompresiou)

---

## 11. NAVIGÁCIA

### Pridať do sidebar (dole pri mene)

```
┌─────────────────────────┐
│  ┌────┐                 │
│  │ DG │  Dano           │
│  └────┘  Admin          │
│  [⚙️ Profil]            │  ← nový link
└─────────────────────────┘
```

Alebo do Settings menu:
```
Settings
├── Profil (NOVÉ)
├── Používatelia (admin)
├── Integrácie
└── Vzhľad
```

---

**Priorita:** Stredná
**Dátum:** 8. január 2026
