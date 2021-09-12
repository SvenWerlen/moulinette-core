# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.7.0] - 2021-09-12
### Added
- Favorites : history, groups

## [3.6.0] - 2021-09-06
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
