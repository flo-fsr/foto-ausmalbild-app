# Foto-Ausmalbild

Eine einfache Web-App, die Fotos direkt im Browser in druckbare Ausmalbilder umwandelt.

## Funktionen

- Bereits aufgenommene Fotos vom Gerät auswählen oder per Drag-and-drop in die App ziehen
- Neues Foto mit der Kamera aufnehmen
- Kontrast, Detailstärke und Linienbreite anpassen
- Das fertige Ausmalbild als PNG speichern oder auf A4 drucken
- Die Fotos werden lokal im Browser verarbeitet und nicht hochgeladen

## Lokal starten

```bash
python3 -m http.server 3000
```

Öffne anschließend `http://localhost:3000` im Browser. Für die Kamera-Funktion muss die Seite über `localhost` oder HTTPS geladen werden. Der Foto-Upload funktioniert auch ohne Kamerazugriff.
