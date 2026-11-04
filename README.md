# Foto-Ausmalbild

Eine Web-App, die Fotos im Browser bearbeitet und in druckbare Ausmalbilder umwandelt.

## Funktionen

- Bereits aufgenommene Fotos auswählen oder per Drag-and-drop ablegen
- Neues Foto mit der Kamera aufnehmen
- Foto drehen, spiegeln sowie Helligkeit und Farbsättigung anpassen
- Vorschau des bearbeiteten Fotos und sofortige Aktualisierung des Ausmalbilds
- Kontrast, Details und Linienbreite für das Ausmalbild einstellen
- Als PNG speichern, über das Teilen-Menü des Geräts versenden oder auf A4 drucken
- Fotos werden lokal im Browser verarbeitet und nicht auf einen Server hochgeladen

## Teilen

Auf unterstützten Geräten öffnet „Ausmalbild teilen“ das System-Teilen-Menü und hängt die PNG-Datei an. Falls der Browser das Teilen von Dateien nicht unterstützt, wird die PNG-Datei heruntergeladen, sodass du sie anschließend zum Beispiel per E-Mail oder Messenger verschicken kannst.

## Lokal starten

```bash
python3 -m http.server 3000
```

Öffne anschließend `http://localhost:3000`. Für die Kamera-Funktion und das native Teilen-Menü muss die Seite über `localhost` oder HTTPS geladen werden.
