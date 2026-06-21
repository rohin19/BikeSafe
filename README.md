[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/lywCqags)

---
# BikeSafe Vancouver
### CMPT 372 - Project Proposal
Group 10: Elton Chen, Tim Supan, Rohin Aulakh, Dat Chau, Yu Wu

---
### The name of our application is BikeSafe
A web application designed to help cyclists plan their routes according to safety, not just distance and elevation. In addition, it will provide information on bike dock availability for bike share services. This application would also provide navigation and real-time user reported alerts to improve biking experience around the city. Moreover, our application would provide route discovery and reviews of existing routes based on users in their area. 

### The problem we aim to solve
Current route planning apps treat all roads as interchangeable and do not consider safety as part of their route planning. 
- Strava - focuses on route discovery, live trip tracking, social competition
- Google - basic bike routing, bike share dock info, navigation
- Komoot - route planning with difficulty ratings, offline map download feature
- https://vancouver.bikerouteplanner.com/ - focused purely on safe route planning

Many of these applications focus on one aspect of biking whilst ignoring the other features. We aim to integrate all aspects vital to biking safely in Vancouver involving route safety ratings, hazards, trip planning, etc. into one web application. This idea stems from common quips about existing apps in this field: *“I find Google maps often suggests dangerous and high-traffic bike routes. For example, biking down Broadway (no bike lane) when there is a dedicated bike road (west 8th) directly next to Broadway. - user on Reddit*”

### Target Audience
The primary audience would be cyclists in the Vancouver area such as, daily commuters, students, tourists, delivery riders, people riding bikes for fun, and even e-scooter or e-bike riders wanting to get around the city better and safer.  

### Scope and Team Epic Assignment
This team was chosen based on Canvas’ random group join feature. Here is the mapping of members to epic/s, based on past project experiences and interest:

- **Tim** - Epic feature #1: Route planning through start and destination on map based on safety, elevation, distance, etc..
- **Rohin** - Epic feature #2: Hazard reporting and analytics, signed in users can report possible cycling hazards they see like construction, road closures, accidents, areas with bad drivers, bike thefts, recent reports, dashboard, heatmap of highly reported areas, etc…
- **Elton** - Epic feature #3: Admin system, manage user reports, manage users, remove fake reports.
- **Yu** - Epic feature #4: Mobi bike share/Lime scooter stations, show bike/scooter stations on map with the number of bikes available and pricing.
- **Dat** - Epic feature #5: Users can log routes they did and review them based on safety, elevation, distance, etc.. so that other users can see these reviews when they start a route that crosses the same streets.

---
### High-Level Architecture
BikeSafe uses Stack A: a separate React single-page front end and an Express/Node.js backend API, communicating using REST.

**Components**:
- Frontend: React(Vite), served as a static bundle
- Backend: Node.js + Express REST API
- Internal Service: SQL database running on the same or separate GCP Compute Engine VM
- External Service/API: City of Vancouver Open Data API for the Bikeways Dataset, datasets from bike share companies for availability data
- Deployment: Both Express API and static React will be served on the same GCP Compute Engine VM using nginx. SQL database on the same or separate VM instance to hold users, routes, bikeway segments and hazard reports.

### Entities and Key-Relationships
User(<u>user_id</u>, name, email, role)\
Route(<u>route_id</u>, start, destination, elevation, distance, safety, duration)\
Hazards(<u>hazard_id</u>, user_id, location, image, category, description)\
Review(<u>review_id</u>, route_id, user_id, start, destination, rating, comments)

A User can create many Hazards (1 to many)\ 
A User can write many Reviews (1 to many)\
Many Routes can have many Hazards (many to many)\
A Route can have many Reviews (1 to many)\

![ER Diagram](./docs/ER_diagram.png)

### Framework Justification
1. **Why two apps over one:** We can modify the backend without touching the frontend or modify frontend without touching the backend when needed. Better security and protection for valuable information and data.
2. **Repo structure:** A monorepo structure with workspaces to manage frontend and backend will be used. This will make managing dependencies and setting up the project easier for our group. It will also allow us to set up a CI/CD pipeline easier if we wish to do so. 
3. **How the two apps talk:** Same VM with nginx as a reverse proxy in front of both. Requests to /api/* are sent on an internal port and all other requests serve the react production build. This will avoid CORS configuration as both are served from the same origin.
4. **API style:** REST api is the default for this project’s scope.




