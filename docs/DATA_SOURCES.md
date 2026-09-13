\# Aperion Data Sources



\## 1. CelesTrak — Satellite Orbital Data



Aperion uses CelesTrak General Perturbations (GP) data as the primary source

for satellite orbital elements.



The project retrieves the `resource` satellite group in CSV/OMM format and

uses the following information for orbit propagation:



\- OBJECT\_NAME

\- OBJECT\_ID

\- EPOCH

\- MEAN\_MOTION

\- ECCENTRICITY

\- INCLINATION

\- RA\_OF\_ASC\_NODE

\- ARG\_OF\_PERICENTER

\- MEAN\_ANOMALY

\- EPHEMERIS\_TYPE

\- CLASSIFICATION\_TYPE

\- NORAD\_CAT\_ID

\- ELEMENT\_SET\_NO

\- REV\_AT\_EPOCH

\- BSTAR

\- MEAN\_MOTION\_DOT

\- MEAN\_MOTION\_DDOT



The downloaded catalog is validated with Pandera before it is accepted.

Records are then deduplicated using NORAD catalog ID and EPOCH.



The current operational catalog contains 50 selected satellites.



CelesTrak GP data is refreshed according to the provider's update schedule.

Aperion's refresh process is designed to avoid unnecessary repeated downloads

and to keep the local orbital catalog available for offline operation.



Official source:



CelesTrak — General Perturbations / OMM Data Documentation

https://celestrak.org/NORAD/documentation/gp-data-formats.php



CelesTrak Usage Policy:

https://celestrak.org/usage-policy.php





\## 2. NRSC Shadnagar — Primary Ground Station



Aperion models the NRSC Shadnagar ground station as the primary operational

ground station for satellite visibility and pass calculations.



NRSC Shadnagar is an Indian Space Research Organisation (ISRO) National Remote

Sensing Centre facility. NRSC states that the Shadnagar campus has ground

stations supporting satellite data reception, processing and dissemination.



Configured station:



\- Name: NRSC Shadnagar

\- Latitude: 17.037804° N

\- Longitude: 78.18818° E

\- Elevation: 0.648 km



These coordinates are stored in:



`data/reference/site\_shadnagar.csv`



The station coordinates are used by Skyfield to calculate satellite elevation,

azimuth and visibility windows.



Official NRSC source:



NRSC Shadnagar Campus

https://www.nrsc.gov.in/nrscnew/about\_campuses\_shadnagar.php





\## 3. Kulasekarapattinam — Secondary Configurable Ground Station



Aperion also supports Kulasekarapattinam as a second configurable ground

station for multi-site pass analysis.



Configured station:



\- Name: Kulasekarapattinam

\- Latitude: 8.3676° N

\- Longitude: 78.0562° E

\- Elevation: 0.010 km



The station coordinates are stored in:



`data/reference/site\_kulasekarapattinam.csv`



This station is used as an additional configurable site in the Skyfield orbit

service and allows the system to compare visibility opportunities across

different ground-station locations.





\## 4. How the Sources Are Used



The data flow is:



CelesTrak

&#x20;   ↓

Satellite catalog download

&#x20;   ↓

Pandera validation

&#x20;   ↓

NORAD/EPOCH deduplication

&#x20;   ↓

50-satellite operational catalog

&#x20;   ↓

Skyfield SGP4 propagation

&#x20;   ↓

Ground-station visibility calculation

&#x20;   ↓

Pass windows

&#x20;   ↓

Aperion scheduler





\## 5. Data Reliability



The ingestion pipeline performs the following checks before accepting a new

catalog:



\- Required satellite fields are present.

\- NORAD catalog IDs are valid.

\- EPOCH values can be parsed as timestamps.

\- Mean motion is positive.

\- Eccentricity is within the valid orbital range.

\- Inclination is within 0–180 degrees.

\- Missing values are checked.

\- Duplicate NORAD/EPOCH records are removed.



If validation fails, the newly downloaded catalog is rejected and the previous

valid catalog remains available.





\## 6. References



\- CelesTrak GP Data Documentation:

&#x20; https://celestrak.org/NORAD/documentation/gp-data-formats.php



\- CelesTrak Usage Policy:

&#x20; https://celestrak.org/usage-policy.php



\- NRSC Shadnagar:

&#x20; https://www.nrsc.gov.in/nrscnew/about\_campuses\_shadnagar.php

