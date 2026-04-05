Below is the updated and consolidated requirements document in English, integrating the previous requirements + the new ones from the user, while keeping it relatively concise and structured.
Cat Shelter Management System — Requirements
1. Cat Profiles
Each cat must have a main profile containing the following fields:
Basic Information
photo (one or multiple)
name
sex
color
age or estimated age
intake date (date of arrival)
rescue source
Identification
microchip number
passport number
sterilization status
Vaccination
vaccine status
rabies vaccine date
Shelter Placement
current location in the shelter
location history (movement history)
Example locations:
ISO
Exam
Kitten Room 1
Kitten Room 2
Kitten Cage
Courtyard
Outside
Foster locations
Location hierarchy should support two levels only (location → sublocation).
2. Medical Section
Each cat profile should include a dedicated medical section where staff can see the full medical case.
This section should include:
diagnosis
medical history
current treatment
past treatment
medications
vaccination dates
rabies vaccination dates
vet visit history
The goal is to allow staff to view the complete medical history in one place.
3. Monitoring
The system should support tracking ongoing observations for each cat:
weight log (with history)
appetite notes
behavior notes
quarantine / isolation flag (ISO)
4. Comments / Notes
Users should be able to add notes to a cat profile.
Each note should include:
date
author
text
Notes can include treatment updates, observations, or other relevant information.
5. Attachments
Users must be able to upload attachments to a cat profile, such as:
blood test results
ultrasound results
veterinary reports
other medical documents
Files should remain associated with the cat profile.
6. Adoption Records
The system should support storing adoption-related documents, including:
adoption contracts
adoption date
optional notes
Cats moved to adoption status should remain in a non-deletable archive.
Archive statuses include:
adopted
deceased
Archived cats remain accessible for viewing.
7. Cat History
Each cat should have a chronological event history, for example:
01.03 — found
03.03 — quarantine
20.03 — courtyard
15.04 — foster Evgenia
The history may include:
intake
location changes
medical events
status changes
8. Reminders
The system must support custom reminders.
Reminders can be used for:
vaccination
medication
vet visits
follow-up checks
other tasks
Requirements:
reminders can be linked to a cat
reminders have a description and date
users can view upcoming reminders
9. Calendar Integration
Reminders should support integration with Google Calendar.
When creating a reminder, the system can optionally:
create a calendar event
include the cat name and reminder description
This can be used for follow-up veterinary visits or other scheduled tasks.
10. Search
The system should include a search field allowing users to quickly find cats by:
name
microchip number
other identifiers
11. Users
The system must allow adding users via email.
Two types of users:
Active users — can log in and manage data
Inactive users (placeholders) — used to represent people involved in the shelter (e.g., foster caregivers) but without system access
12. Statistics
The system should provide basic statistics such as:
number of cats currently in the shelter
number of cats in foster care
number of cats adopted this year
number of new cats this year
number of cats in archive
MVP (Version 1) — Basic Navigation
Main Page
The application opens with a main page showing:
Title:
Friends of Larnaca Cats
Below the title:
list of locations (initially e.g. Foster Evgenia)
Users can click a location to view cats there.
Location Page
Shows:
list of cats in that location
button Add Cat
Users can:
open a cat profile
add a new cat
Cat Page
Shows the cat profile including:
basic information
medical section
notes
attachments
history