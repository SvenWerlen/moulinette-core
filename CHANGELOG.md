# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2021-06-24
### Added
- UI modes (compact/default)
### Changed
- Window position and width saved/restored

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
