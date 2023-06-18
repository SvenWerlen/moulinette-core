# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [11.1.2] - 2023-06-12
### Fixed
- 11.1.2: Crashes while indexing own s3 files #12
- 11.1.1: Fix folder names disappear when expand/collapsing, even core data folders
### Changed
- Cache baseURL for S3 (fix for non-performant workaround introduced in 11.0.7)

## [11.0.6] - 2023-05-07
### Fixed
- 11.0.9: Fix fileExists for S3
- 11.0.8: Fix folder creation for S3 and special characters (&,+)
- 11.0.7: Fix for V11 and S3
- 11.0.6: Official support for V11
- 11.0.5: Indexed packs have invalid path on The Forge
- 11.0.4: Fix for The Forge (Bazaar). Invalid URLs for thumbs.
- 11.0.3: Fix uninitialized windows position (=> errors)
### Changed
- Improvement on how Moulinette stores the position of the window
- Indexes are now world-specific
- Index folders from multiple sources
- Optimizations for The Forge (hosting provider) & S3
### Added
- Export & Import sources configurations
- Module filters (ex: scenes can be filtered with "gridless")

## [10.8.1] - 2023-03-21
### Fixed
- 10.8.1: help information displayed even when search results
### Added
- API for retrieving the URL of an asset

## [10.7.0] - 2023-02-19
### Added
- Marketplace integration (available assets)
- Tooltips to guide user (authentication, moulinette support)

## [10.6.2] - 2023-02-04
### Fixed
- 10.6.0: Help still recommending V9 (rather than V10)
- 10.6.1: Moulinette Window opens with width of 200px (first time)
- 10.6.2: Animated tiles not animated any more
### Added
- #56 Feature: Add hotkey to choose image browser 

## [10.5.0] - 2023-01-31
### Fixed
- 10.5.0: #59 After update, file picker no longer works 
### Changed
- Make dropdown list mode configurable

## [10.4.0] - 2023-01-28
### Changed
- New interface general availability

## [10.3.2] - 2022-12-25
- 10.3.1: fix for Ernie's modern UI
- 10.3.2: fix #2 for Ernie's modern UI
### Changed
- New interface (auto-scroll lists, breadcrumbs, actions)
- New interface for FilePicker
- Improved footer
### Added
- Whole word search & regex search

## [10.2.2] - 2022-11-13
### Fixed
- 10.2.1: folder expand not working in Moulinette FilePicker
- 10.2.2: sound indexing doesn't work on The Forge
- 10.2.3: fix for 10.2.2 which breaks local hosting (not on the Forge)
### Added
- Configure sources for scenes (compatibility with The Forge)
- Improved UI for "in progress" indexing

## [10.1.2] - 2022-10-30
### Fixed
- 10.1.1: fix tentative for null options (bucket)
- 10.1.2: fix V10 compatibility
### Changed
- Filter sources based on type
- UI improvements
### Added
- Configure sources for scenes

## [10.0.5] - 2022-09-04
### Fixed
- 10.0.1: fix v10 packaging issues
- 10.0.2: folder view doesn't list subfolders systematically
- 10.0.3: focus should not go back to search field when selecting a new creator/pack
- 10.0.3: #49 : Pressing ENTER brings up default picker instead of searching
- 10.0.4: fix for null while getting S3 source
- 10.0.5: FileExists check fails when game hosted on The Forge #39
### Changed
- Compatibility with V10
- Major version based on FVTT

## [4.9.0] - 2022-08-14
### Added
- Moulinette Shortcuts (presets)

## [4.9.0] - 2022-08-20
### Added
- Configuration to enable/disable available content from Moulinette Cloud

## [4.8.0] - 2022-07-24
### Fixed
- 4.8.1 : fix packaging
- 4.8.2 : fix prefabs tab not working any more
### Added
- Moulinette API (searchUI & assetPicker)

## [4.7.0] - 2022-06-10
### Added
- Support for thumb sizes

## [4.6.1] - 2022-06-09
### Fixed
- 4.6.1: Fix confusing Moulinette message when supporting platinum creators
### Changed
- Moulinette UI vertically resizable
- Manage sources (for indexing process)

## [4.5.1] - 2022-04-09
### Fixed
- #36 Cannot figure how to add more images
- 4.5.1: #40 Non-host GMs can't use Moulinette for games hosted on The Forge
- 4.5.2: Rollback 4.5.1, causing issues
### Added
- Configuration for highlighting Moulinette Cloud packs in dropdown lists

## [4.4.0] - 2022-04-02
### Added
- Configuration to enable/disable controls in FVTT menus
- Moulinette Layer : support for left/right clicks. Implementation done by submodules. Release for everyone.

## [4.3.3] - 2022-03-05
### Fixed
- 4.3.1: Moulinette Cloud : images from TTV now showing up
- 4.3.2: Moulinette Tiles search not working when Moulinette Cloud disabled
- 4.3.3: Fix ScenePacker downloads fail (when spaces in file path)
### Added
- Moulinette Layer : support for left/right clicks. Implementation done by submodules.

## [4.2.3] - 2022-02-07
### Fixed
- 4.2.1: Tabletop Audio (and other) folders with space in their name cannot be expanded
- 4.2.2: Small improvements and bug fixes for ScenePacker & prettifier
- 4.2.3: WebM not indexed as image/tile any more
### Added
- New control buttons for soundpad, soundboard, favorites and faceted search
- Help interfaces
### Changed
- Control buttons harmonized (vertically)

## [4.1.3] - 2022-01-20
### Fixed
- 4.1.1: New Search UI not working due to missing commit in release
- 4.1.2: Export to Moulinette Cloud broken if spaces in image path
- 4.1.3: Workaround for bucket configuration "null"
### Changed
- Keybind from FoundryVTT (doesn't require extra module anymore)

## [4.0.3] - 2021-12-23
### Fixed
- 4.0.1: Module version for 9.x release
- 4.0.2: Remove support for FVTT 0.7 and 0.8
- 4.0.3: TTA & Ivan Duch sounds not listed due to new structure
### Changed
- First attempt to support 0.9.x version

## [3.13.0] - 2021-11-14
### Added
- Warning on Patreon Integration when user is authenticated but not supporting Moulinette (yet)
- Link to support Moulinette (Patreon Integration)

## [3.12.1] - 2021-10-31
### Fixed
- 3.12.1 : Use ForgeVTT FilePicker to speed up upload (eTag)
### Changed
- Default view should be "list view"

## [3.11.0] - 2021-10-30
### Fixed
- Folder view not working in Moulinette Sounds
### Changed
- Show lifespan support on Patreon

## [3.10.0] - 2021-10-16
### Changed
- New Moulinette icon
- Add packId for Scene Packer integration

## [3.9.0] - 2021-10-11
### Changed
- "Forge" removed from all the UI (to avoid confusion with The Forge)
- Default shortcut has been changed to "CTRL+M" (CTRL+F is too common)

## [3.8.0] - 2021-09-30
### Changed
- Selected pack remains selected after changing tab (until new selection)

## [3.7.1] - 2021-09-25
### Added
- Previews : search for assets among creators

## [3.7.0] - 2021-09-30
### Changed
- Selected pack remains selected when changing tab (if matching pack exists)

## [3.6.2] - 2021-09-12
### Added
- Favorites : history, groups

## [3.5.0] - 2021-09-06
### Changed
- Improved workflow for Patreon integration
### Added
- Support for multiple concurrent sessions (5$+)

## [3.4.3] - 2021-08-23
### Fixed
- 3.4.1: Attempt to fix the issues with Patreon login/connect
- 3.4.2: Patreon UI for Warhammer system
- 3.4.3: Moulinette Picker still enabled when configuration is off
### Added
- Support for Moulinette Cloud (all)
- Progressbar for Cloud update

## [3.3.0] - 2021-07-23
### Changed 
- Switch to Moulinette Cloud (new servers)
- Show pledges and gifts on patreon window
### Added
- Claim a gift from a creator
- Configuration to disable Moulinette Cloud

## [3.2.1] - 2021-07-11
### Added
- Patreon : disconnect & reconnect buttons
- Warning message when token will expire in less than 30 minutes
- Error message when token is expired
### Fixed
- 3.2.1: Fix Filepicker with "List view"

## [3.1.8] - 2021-06-24
### Added
- UI modes (compact/default)
### Changed
- Window position and width saved/restored
### Fixed
- 3.1.8: Missing settings when default FilePicker used
- 3.1.7: Indexing not working on S3
- 3.1.6: Search when "All publishers" selected
- 3.1.5: Folder collapsing when clicking on assets
- 3.1.4: Workaround for "The Forge" (index.json & server-side caching)
- 3.1.3: Workaround for "The Forge" (index.json & server-side caching)
- 3.1.2: .mp3 and .wav not indexed
- 3.1.1: Downloading fails for names with spaces

## [3.0.0] - 2021-06-19
### Added
- Moulinette FilePicker for images and imagevideo
### Fixed
- Remove warning for missing index.json files

## [2.6.0] - 2021-06-16
### Added
- Browse mode by creator (rather than pack)

## [2.5.4] - 2021-06-07
### Added
- New view mode (browse)
- Data caching
### Fixed
- Drag & drop after scrolling down > 100 assets
- Download to S3 storage
- Dependencies not properly handled for BW packs
- Indexing fails if "&" in pack names
- Postpone download after drop

## [2.4.1] - 2021-06-06
### Fixed
- Don't capitalize publisher/pack names
### Changed
- Sessions last 24 hours

## [2.3.0] - 2021-06-01
### Added
- Patreon integration enabled by default

## [2.2.0] - 2021-05-29
### Added
- support for assets caching

## [2.1.0] - 2021-05-27
### Added
- ignore.info for ignoring some files
- moulinette.json for metadata

## [2.0.1] - 2021-05-24
### Added
- Compatibility with FVTT 0.8.5

## [1.9.2] - 2021-05-23
### Added
- Capabilities for downloading all dependencies

## [1.8.2] - 2021-05-15
### Added
- Capabilities for new scene UI
- Capabilities for prefabs
- Capabilities for pinning soundboard

## [1.7.2] - 2021-05-11
### Added
- DisplayMode : tiles / list
- Integration with Moulinette Cloud and Patreon (preview)

## [1.6.0] - 2021-05-05
### Fixed
- 1.6.3 : Lazy-loading fix (https://github.com/SvenWerlen/moulinette-tiles/issues/4)
- 1.6.1 & 1.6.2 : Fix Forge's Bazaar regression
### Added
- Support for Forge's Bazaar (Thx: @Kakaroto!!)

## [1.5.0] - 2021-05-03
### Added
- Support for existing sources (modules can define their own sources)

## [1.4.4] - 2021-05-03
### Added
- Support for S3 as storage

## [1.3.0] - 2021-04-22
### Removed
- All Forgotten Adventures assets but 1 for showcase purposes
### Added
- Configuration for hiding showcase content

## [1.2.0] - 2021-04-21
### Added
- Modules can add macros to core compendium


## [1.1.0] - 2021-04-20
### Changed
- Pagination (display 100 assets and autoload on scroll)

## [1.0.2] - 2021-04-18
### Added
- Core engine
