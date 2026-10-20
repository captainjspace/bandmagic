# UPDATE

I have stashed the old CLAUDE.md as it was too large and confusing
Since the app is live and getting better by we'll prep updates like this and per branch to stay focused

## Branch focus 
Responsive Design 

### Mobile First Player
On mobile we have to collapse to a single column on thye track group pages.

It can stay be auto in the footer but its needs a little more height and reability
Or ir might be better to have a completely different flavor component  up 
top.

It should not start the right any more too hard to use on mobile.

It could also just be a 2nd Tier header component at all times on mobile
so like the header the data scrolls under
It could as colllapsible div in that case.

Weigh it out and choose - we wont know until we play with it.
Not a big deal if we change it a few times...

Sizing of the actions box should contract and nav as well

### Universal Search Type Ahead and Results Page

this isa big addition a universal search and result Page
This shoudl go in the header center bottom 

typing searches for track groups, songs, assets and "enter" 
takes us to search results page flex layout here we can rely good differentiation in the component
cards - search results should have some flag as to the entity Type

### Global.css vs in page javascript

So I think we got a a little carried away with so much flexibilty in the colors section
Lets peel back to defined css utiility classes for any thing new.
take advantage of the refactorign process.  the most importnat part here is the responsive 
and clear layering of classes

### Final item for today 
I went to "replace" a track - and got an error - so I replaced it manually.
But instead of an error when uploading - let's just get confirmation 
Are you sure you want to replace this track

## Work Strategy 
I've started a fresh branch - the code base is clean
Work through in auto mode - you have permission to execute and standard local code/shell
And I just refreshed the GCP auth login.

If you have questions have me answer them upfront.  And work all the way through.
when you are ready commit and open a pr.  I will working with 2 other claude sessions.

10/20/2026



