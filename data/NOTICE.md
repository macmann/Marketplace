# Myanmar reference data

`myanmar-locations.json` is a versioned reference snapshot, not a representation of current administrative or political control. It contains the 330 ADM3 units in geoBoundaries' Myanmar 2019 dataset, joined by name (and approximate region proximity for duplicate names) to bilingual names and P-codes in the MIMU workbook mirrored by v3ss0n. Locations are editable in the application. The snapshot does not claim to include subsequent district/township changes.

Sources:

- geoBoundaries / William & Mary geoLab, Myanmar ADM3, pinned revision `9469f09`; source Myanmar Analytics Project / USAID, reference year 2019; CC BY 4.0: https://www.geoboundaries.org/api/current/gbOpen/MMR/ADM3/ and https://github.com/wmgeolab/geoBoundaries/tree/9469f09/releaseData/gbOpen/MMR/ADM3 . Geometry is not shipped. Bounding-box midpoints are rounded to three decimals and represent approximate township areas, never household addresses. Changes: extracted names and approximate centers, omitted geometry, joined bilingual reference names.
- MIMU / GAD March 2015 workbook, distributed in https://github.com/v3ss0n/myanmar_state_regions_json (MIT; copyright notice below). Used for bilingual names, district hierarchy and stable P-codes. Only units present in the 330-unit geoBoundaries snapshot are included.
- https://github.com/tunmin11/mmgeo at `348d1e53fc420ef7ea82278de8e09f906f5c8503` (ISC, Copyright 2024 tunmin), used for 15 consolidated region/state names and approximate regional centers. Its additional locality entries are not treated as official townships.

Names and hierarchy need local/native review before public launch. Existing identifiers are preserved through aliases; seed reruns do not overwrite administrator edits. Future reference updates must explicitly reconcile P-codes and aliases rather than deleting locations used by listings.

## ISC license

Copyright 2024 tunmin

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## MIT license (bilingual workbook mirror)
MIT License

Copyright (c) 2017 Phyo Arkar Lwin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Source checksums

SHA-256 of the exact downloaded inputs used to generate this snapshot:

- Bilingual workbook: `19699bf70eecd56540444dc486b57e7675fd73fdbf791b7756b5d9446f3a01e9`
- Simplified geoBoundaries GeoJSON: `94c0c9af839094257d13a6fe6590feddb2dcb04540d87e58b656c9f000fb92a2`
- mmgeo JSON: `27e2b4c536ce8dcaee71cde3a743448d06ab6645601a16f96c70fb8f6238fdcb`
