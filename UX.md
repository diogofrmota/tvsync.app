1. Non-Logged-In Users

1.1 Header
* Home
* Register
* Login

1.2 Home page

Hero Section

TvSync

Track your TV shows and movies in one place.

TvSync focuses on a clean design and essential features, without unnecessary distractions.

Join a community of TV show and movie lovers.

* Track what you are watching
* Build your watchlist
* Discover new TV shows and movies
* Check what is popular
* View your personal statistics

Create an Account (button)

Discovery lists, in this order

1. Trending Movies This Week
2. Trending TV Shows This Week
3. Popular Movies
4. Popular TV Shows
5. Highest-Rated Movies
6. Highest-Rated TV Shows

Home and Explore share these lists: a section that appears on both pages carries
the same name and the same titles in the same order, because both pages read one
shared, cached definition of every list. Explore adds its featured slideshow, the
search field and a New & Upcoming Movies list; everything else matches.

Each list

* Shows up to the first twenty titles in one horizontally scrolling rail.
* Includes a See All button on the section title line, which opens the complete
  list.
* Shows the titles it has when the list comes back short.

Footer

* Privacy Policy
* Terms of Service
* Contact
* Copyright information

Functionality

* Users can select Create an Account to open the registration page.
* Users can select See All to view the complete list for a section.
* Users can select a movie or TV show poster to open its details page.
* Users can browse public movie and TV show information without creating an account.
* Users must create an account to track content or manage a watchlist.

1.3 Register page

Layout

Black background with a centred, dark elevated registration card with a spotlight-gold accent.

Content

* Back to Home (top left)
* TvSync
* Create an Account
* Email address
* Username
* Password
* Confirm password
* Create Account button
* Continue with Google
* Already registered? Log in

Functionality

* Users can create an account using an email address, username and password.
* Email addresses and usernames must be unique.
* Passwords must be stored securely using password hashing.
* Users must confirm their password before submitting the form.
* After registration, a verification email is sent using Resend.
* Users must verify their email address before accessing their account.
* Verification emails can be resent when necessary.
* Users can register using Google authentication.
* Users who register with Google do not need to complete email verification separately.
* Users can navigate to the login page if they already have an account.


1.4 Login page

Layout

Black background with a centred, dark elevated login card with a spotlight-gold accent.

Content

* Back to Home (top left)
* TvSync
* Login
* Email address or username
* Password
* Login button
* Continue with Google
* Forgot password?
* New user? Create an account

Functionality

* Users can log in using either their email address or username.
* Users can log in using Google authentication.
* Users can navigate to the registration page.
* Invalid login attempts display a clear error message.
* Users can request another verification email if they haven’t verified yet.
* Users can request to reset password in case they forgot. An email to reset password is sent to their email via app “Resend”.

1.5 Forgot Password page

Layout

Use the same visual style as the login and registration pages.

Content

* Back to Login (top left)
* TvSync
* Reset Password
* Email address
* Send Reset Email button

Functionality

* Users enter the email address associated with their account.
* A password-reset email is sent using Resend.
* The response must not reveal whether an email address is registered.
* Password-reset links must expire after a limited period (24 hours).
* Each reset link can only be used once.

1.6 Reset Password page

Layout

Use the same visual style as the login and registration pages.

Content

* TvSync
* Create a New Password
* New password
* Confirm new password
* Reset Password button

Functionality

* Users can create and confirm a new password.
* The password is securely updated after successful validation.
* Users are redirected to the login page after resetting their password.
* Expired or invalid reset links display an option to request a new link.

2. Logged-In Users

Header

* Movies
* TV Shows
* Search
* Profile

On mobile, use a bottom navigation bar.

2.0 Movie and TV Show Items

Every movie and TV show item looks and behaves the same wherever it is listed
(Home, Explore, Movies, TV Shows, Profile, and search results).

* A title that is not in the library shows a small yellow square with a black
  plus in the bottom-right corner of the poster. Selecting it adds the title to
  the user's library.
* Once the title is in the library, the bottom-right corner shows a small yellow
  "Added" label in black text, and an empty heart appears in the top-right
  corner.
* The "Added" label and the library status labels (Watching, Planned to Watch,
  Finished) are only shown where they add information: Explore, the discovery
  lists, and another user's profile. The user's own Movies, TV Shows, and Profile
  pages never repeat them.
* Selecting the heart turns it red and adds the title to the user's favourites.
  Selecting it again removes the favourite.
* Watch progress is shown as a bar across the bottom of the poster. The bar fills
  in yellow as the title is watched and turns green across the full width of the
  poster once it is finished. A title that has not been started shows no bar.
  Percentages and episode counters are never written under the poster.
* The badges stay small so the poster art remains visible.
* Signed-out users who select the plus are sent to the login page and returned to
  the list they came from.

2.1 Movies

Sections

Planned to Watch

Movies the user wants to watch.

Finished

Movies the user has completed.

Discover Movies

A button that opens the Search page with the Movies tab selected.

Functionality

* Users can move movies between Watchlist and Finished.
* Users can remove movies from their library.
* Users can select a movie poster to open its details page.
* Empty sections display a simple message to discover movies.
* The user’s progress and library changes are saved automatically.

2.2 TV Shows

Sections

Watching

TV shows with at least one watched episode that are not fully completed.

Planned to Watch

TV shows the user wants to watch.

Finished

TV shows for which the user has watched all available episodes.

Discover TV Shows

A button that opens the Search page with the TV Shows tab selected.

Functionality

* Users can move TV shows between Watching, Planned to Watch and Finished.
* Users can remove TV shows from their library.
* Users can select a TV show poster to open its details page.
* TV show progress is calculated using watched episodes.
* Empty sections display a simple message to discover TV shows.
* The user’s progress and library changes are saved automatically.

2.3 Search

Explore landing

* The subtitle reads "Discover trending titles, new releases and all-time
  highlights across movies and TV Shows."
* The search field is wide enough to read its own placeholder, "Search movies and
  TV shows", before anything is typed.
* The discovery lists are the shared lists described in 1.2, plus New & Upcoming
  Movies.

Results

* Searching shows one list of the movies and TV shows related to the term.
* Results are ordered by popularity, most popular first.
* There are no content-type tabs, no genre filter, and no sort control.
* Desktop: Responsive grid based on the available screen width.
* Mobile: Three columns per row.

Functionality

* Users can search for movies and TV shows by title from the search field.
* Users can select a poster to open its details page.
* Each result includes a quick action for adding the item to the user’s watchlist.
* Existing library items display their current status.

2.4 Profile

Profile Information

* Display name
* Username
* Biography
* Edit Profile and Log out buttons, centred below the biography

Social Information

* Following
* Followers

Selecting either value opens the corresponding user list.

Sections, in this order

1. Statistics
2. TV Shows
3. Favourite TV Shows
4. Movies
5. Favourite Movies

The favourite sections are titled first and marked afterwards: the section name is
followed by a red heart icon, never preceded by a heart emoji. The same applies to
the complete favourites lists behind their See All buttons.

Every list section uses the same rail as Home and Explore: up to the first twenty
titles scroll horizontally, and a See All button sits on the section title line
and opens the complete list. The rail ends with the last poster; See All is never
repeated as a tile inside the rail. A section with fewer than twenty titles shows
the titles it has.

Statistics

Only two cards are shown on the profile:

* TV Shows Watched
* Movies Watched

Selecting See All opens the Statistics page with every statistic (TV Shows
Watched, Movies Watched, Episodes Watched, Time in TV Shows, Time in Movies,
Number of Reviews) and a Compare with Following button at the bottom.

See All destinations

* TV Shows opens the TV Shows library.
* Movies opens the Movies library.
* Favourite TV Shows and Favourite Movies open the complete favourites list.

Functionality

* Users can view their profile information and activity.
* Users can edit their profile.
* Users can view their followers and the users they follow.
* Users can open another user’s profile.
* Users can follow or unfollow other users.
* Users can compare statistics with their following list.


2.5 Edit Profile

Content

* Display name
* Username
* Email
* Biography
* Save Changes button
* Change Password
* Delete Account

The Delete Account button is the only destructive-looking control on the page: a
black button with a red border and red label, instead of the shared white
secondary style.

Functionality

* Users can update their profile information.
* Usernames must remain unique.
* Users can change their password.
* Users who registered with Google can create a password if required.
* Users can permanently delete their account after confirming the action.
* Users can update their email.

2.6 Movie and TV Show Pages

Individual Movie Details Page

Content

* Movie poster
* Movie title
* Release year
* Runtime
* Status
* Genres
* Rating: the TMDB member score out of 10, labelled TMDB, plus the age
  certificate from the TMDB release dates. The genuine IMDb score is added only
  when OMDb returns one; a TMDB score is never presented as an IMDb score.
* Description
* Trailer
* Cast
* Director
* Reviews written by TMDB members
* Streaming availability
* Similar movies

Layout

* A compact poster sits beside the title, the fact badges, the genres, the
  director and the rating; the poster never fills the screen.
* The personal actions come immediately after that header, so a movie can be
  added to the library without scrolling.
* The description, trailer, cast and reviews follow, in that order.

User Actions

* Add to Library (and they can select the status like planned to Watch, finished, etc)
* Remove from Library
* Mark as Favourite
* Rate the movie

Functionality

* The current tracking status is clearly displayed.
* Users can update the movie’s tracking status.
* Users can submit or update their personal rating.
* Users can play the trailer without leaving the page.
* Users can select cast members or similar movies to view more information.
* Users can read reviews other people published on TMDB, expanding a long review
  in place or opening it on TMDB.

2.7 Individual TV Show Details Page

Content

* TV show poster
* TV show name
* Release year
* Number of seasons
* Number of episodes
* Current status
* Genres
* Rating: the TMDB member score out of 10, labelled TMDB, plus the age
  certificate from the TMDB content ratings. The genuine IMDb score is added
  only when OMDb returns one; a TMDB score is never presented as an IMDb score.
* Description
* Trailer
* Cast
* Reviews written by TMDB members
* Streaming availability
* Similar TV shows

Layout

* A compact poster sits beside the name, the fact badges, the genres and the
  rating; the poster never fills the screen.
* The episodes come immediately after that header: the episode slider first,
  then the season list.
* The personal actions follow, and the description, trailer, cast and reviews
  close the page, in that order.

Episodes

* The episode slider shows the season the user is watching — the first season
  with an unseen episode, or the last season once the show is finished — as
  cards that scroll from left to right, opened on the next unseen episode.
* Each card shows the episode still, its season and episode number, its name,
  its air date and a single button that marks it seen or unseen.
* Above the slider sit the season name, the overall "seen" count, and a progress
  bar that fills in yellow and turns green when the show is complete.
* Below the slider, every season is a dropdown showing its own seen count and
  progress bar. Opening one lists that season's episode titles, each with the
  same seen toggle, plus a control that marks the whole season seen or unseen
  and a link to the season page.

User Actions

* Add to Library
* Mark as Watching, Finished, Planned to Watch
* Remove from Library
* Mark as Favourite
* Rate the TV show
* Mark an entire season as seen or unseen
* Mark a single episode as seen from the slider or from the open season

Functionality

* The user’s overall progress is displayed.
* Progress is automatically calculated from watched episodes.
* Users can update the TV show’s tracking status.
* Users can submit or update their personal rating.
* Users can play the trailer without leaving the page.
* Users can read reviews other people published on TMDB, expanding a long review
  in place or opening it on TMDB.

2.8 TV Show Season Page

Content

* TV show name
* Season number and title
* Season poster
* Season description
* Release year
* Number of episodes
* Watched progress
* Episode list

Functionality

* Users can mark the entire season as watched or unwatched.
* Users can mark individual episodes as watched.
* Users can select an episode to open its details page.

2.9 Individual Episode Details Page

Content

* TV show name
* Season and episode number
* Episode title
* Episode image
* Release date
* Runtime
* IMDb rating
* Description

User Actions

* Mark as Watched
* Mark as Unwatched
* Previous Episode
* Next Episode

Functionality

* Users can update the episode’s watched status.
* Updating an episode automatically updates the TV show’s overall progress.
* The next unwatched episode is clearly identified.

3. Social Pages

3.1 User Profile Page

Content

* Display name
* Username
* Biography
* Follow or Unfollow button
* Following count
* Followers count
* Public statistics
* Favourite movies
* Favourite TV shows

Functionality

* Users can follow or unfollow another user.
* Users can view public profile information and activity.
* Private account information is never displayed.

3.2 Followers and Following Pages

Content

* Search bar
* Display name
* Username
* Follow or Unfollow button

Functionality

* Users can search within the list.
* Users can open another user’s profile.
* Users can follow or unfollow users directly from the list.

4. Footer Pages

4.1 Privacy Policy

Explain:

* What personal data is collected
* How personal data is used
* How authentication data is protected
* Which external services process data
* How users can request or delete their data
* Cookie usage
* Contact information

4.2 Terms of Service

Explain:

* Account responsibilities
* Acceptable use
* Content ownership
* Service availability
* Account suspension or termination
* Limitation of liability
* Changes to the terms
* Contact information

4.3 Contact

Content

* Name
* Email address
* Subject
* Message
* Send Message button

Functionality

* Users can submit questions or report problems.
* A confirmation message is displayed after successful submission.
* Basic spam protection and rate limiting are applied.