# Foto-Ausmalbild

Eine Web-App, die Fotos im Browser bearbeitet und in druckbare Ausmalbilder umwandelt.

## Funktionen

- Bereits aufgenommene Fotos auswählen oder per Drag-and-drop ablegen
- Neues Foto mit der Kamera aufnehmen
- Foto drehen, spiegeln sowie Helligkeit und Farbsättigung anpassen
- Vorschau des bearbeiteten Fotos und sofortige Aktualisierung des Ausmalbilds
- Kontrast, Details und Linienbreite für das Ausmalbild einstellen
- Als PNG speichern oder auf A4 drucken
- Fotos werden lokal im Browser verarbeitet und nicht hochgeladen

## Lokal starten

```bash
python3 -m http.server 3000
```

Öffne anschließend `http://localhost:3000`. Für die Kamera-Funktion muss die Seite über `localhost` oder HTTPS geladen werden.
