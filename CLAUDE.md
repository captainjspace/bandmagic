# Rolling Blackout Application Updates


Trackgroup Update

## Add Edit Notes -- Trackgroup detail page 
- Notes live on tracks within tracked group
- they are solid but using them i noticed a simple typo i need to edit in firebase.
- add edit function

## Add Tagging - Trackgroup summary page
-- we'll use the tags for organization later 
-- now i just need to be able to bang down the list / prework

## Add Stars ***** -- 1-5 arbitrary sort - the star go with the user id - 
-- this will help organize that page quickly sort on stars then data 
-- each start is 100 click to set the start at 300 -- double click to type 301
-- star in an int...  display max at 5 stars --

## active/inactive an time based inactive drops to bottom 
-- boolean lets us deactivate 
-- active until (optional field) (ie.  Dr Rick gig was last Saturday)

sort active, 5 stars, most recent on top
inactive, no stars, oldest on bottom

-----------------
Planning more Navigation



## Tasks - Trackgroups/Songs (not tracks-likely the tasks will mean replacing a track)
-- add tasks -- "hey john listen to this Trackgroup tag tracks write notes for improvments on the tracks.
-- john logs in and see his actions listens to track writes notes - tasks mark complete.
-- bill add lyrics asset to "Song" - Trail of Broken Love
     
     
## We're moving towards as new entry page 

FLEX (standard vertical fhone - but on my 32 inch better to have more visible on teh screen)
|My favorities
|My tasks
|Band Pinned Items
|5 star active
|4 star...

### Display Links/Icons to keep it manageable we dont need the full card 
These will be less decorative card limited track group name, key icon
these would be hot links to the trackgroup  pins for pin a mini rolling blackout logo for admin pinned and some kind of font awesome icon for tasks.
it might to just be a menu nav ?

### a bit more context 
For example June 2026 is that the bottom - the first list of 10 songs to learn.
I need to mark that a priority. 
Dr Rick's was critical to get ready for gig but it's expire the gig in the past -- we don't need actively surfaced.  
the list active -- i think this managed with both a boolean to deactivate or date based active until which mr

### Purpose and Classifications
The real tagging ... 
- Typically there is a reason i assemble the lists -- learn these songs, check out this old stuff i found
- study these for a recording session, prep a gig, this has mixes requiring feedback. my favorite or listening 
- finally there are the albums.  

this classification system is will emerge no point in commiting to somehing firm yet
right now it could Album with deadlines to i like lists.... there won't enough data to ever cause problem

### Tags / Search -- search by attribute would be good fro exmaple overdubbing - if coudl search for overdubbng and take thsoe seachg resulst and save as a atrack gorup and assign overdub tasks to the band in a list that has a deadline 2 weeks out - and the list is inactive that isa legit use case
an option to search by tag - i looked for overdubbing
----------------------


# Songs / Inherited Traits -- this goes for the asset /tags

- inheritance got a little weird along the way.  
- if a songs has an asset the track inherits - adding lyrics to night angel should be inherited on in the track group my new version should show the link to the lyrics.
- on the track group listing page - it's showing the track tags overdubbing and almost.  
we don't need to remove that now but i'm pretty sure means if 20 songs have fre form tags that does;t play - on th detail page worth - it doesn't need to be removed yet -- let sleeping dogs lie 

-------------------


## Track Information and ID3 Tags
- this is a major port 
- 3-4 years ago i wrote a cli tool using the mutant library in python.
- we're porting to node id3 - cli tool, api the package can should live independently of this application.

requirements are best extracted from the code itself but this is how had success
yaml - yaml is easier to write than json
stacked yaml - band., album, track - minimizes redundnacy and errors
the merged yaml then needs to locate the album are and lyrics - these are generally easy entries.
- encoded image 
- effectively encoded lyrics
- identifying candidates need to find the art image, resize the frane 300x300 i believe
cover.jpg, album.jpg etc - common name list - or take name - suggest we always rename to a standard and place in the song folder
same with lyrics which are just text - there is a gotcha which uploading to drive my complicate access the - we have to have user upload to the application
to avoid security problems.
other key feature - the app always reads the existing tags and archives them dated, gzipped  for rollback
- again best case scenario is use the tool to tag the mp3 in advance and updload the assets but unlike chord chart
- since we moving to node - internally we operate with json - so yaml is is just transform and out.

### Track Tag Capture and Display
- is reading the tags for the player or the songs - i think it safe to say 95% of the tags are song 
- storage ... ID3 documents - even i have yaml we should probably store the json docs in firestore and interface there
which mean an editor page band album song - album art and lyrics and dynamic assembly of the final document to be applied.

#### ID3 owner entity will be song but final override can be at the track level 00 BUT limited to things liek dates or session details.



