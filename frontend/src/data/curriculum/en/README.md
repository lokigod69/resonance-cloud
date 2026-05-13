Vendored curriculum JSON copies for the frontend bundle.

Source of truth: `D:\CODING\ResonanceTEST\curriculum\content\en\`.

Copy step after source curriculum changes:

```powershell
Copy-Item -LiteralPath '..\curriculum\content\en\*.json' -Destination 'frontend\src\data\curriculum\en\' -Force
```
