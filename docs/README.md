# Moulinette Documentation

Most screenshots on the [Home page](..) are self-explanatory. 
This page provides additional details as a FAQ.

* [How to bring my assets and let Moulinette manage them?](#how-to-bring-my-assets-and-let-moulinette-manage-them)
* [How to index assets provided by other modules?](#how-to-index-assets-provided-by-other-modules)

## How to bring my assets and let Moulinette manage them?

By default, Moulinette expects your assets to be deployed in a specific "custom" folder, depending on the type of asset:
* `moulinette/images/custom/` for images and tiles (`gif`,`jpg`, `jpeg`, `png`, `webp`, `svg`)
* `moulientte/sounds/custom/` for sounds and music (`mp3`, `ogg`, `wav`)

In that folder, you need to make sure to have a 2-level structure
```
<level1 - publisher>
  <level 2 - pack>
    <level 3 - assets or subfolders>
    ...
```

* The first level will be identified as "publishers"
* The second level will be used for "packs"
* Moulinette will then scan all assets in that folder (including its subfolders)

## I already have assets in Foundry. Can I reuse them without having to move them into /moulinette/.../custom folders?

Yes, you can use one of those two solutions.

### Create symbolic links

_(If you don't know what a symbolic link is or how to create it, ignore this solution)_

You can make Moulinette think that your folders are in `/moulinette` folder even if it's not the case. 
For that, you'll need to create symbolic links to your folder. 

```
/moulinette
  /images/custom
    publisher-name-1 (--> link to /your-folder)
    publisher-name-2 (--> link to another folder)
  /sounds/custom
    publisher-name (--> link to /your-folder)
```

### Use advanced configuration

You can configure Moulinette by specifying a path to a custom folder. 
* Configure Settings | Module Settings | Moulinette for FoundryVTT
* Specify a custom path (Assets custom path)

Now, when you index assets (images or sounds), Moulinette will also scan the configured folder and list the assets.

In addition to this you need to create AT LEAST 1 manifest file with extension `.mtte`. This indicates to Moulinette that you want the folder to be scanned.

If you want to specify 1 publisher and have all assets in 1 single pack, create a file with extension `.mtte` at the root of your folder(s) and provide following content
```
{
  "publisher": "My custom publisher",
  "pack": "My custom pack"
}
```

Structure example:
```
this-is-my-custom-path/
  root-folder/
    info.mtte
    asset1.jpg
    asset2.jpg
    asset3.webp
    ...
```

If you want to specify 1 publisher and let Moulinette consider each subfolder as pack, create a file with extension `.mtte` at the root of your folder(s) and provide following content
```
{
  "publisher": "My custom publisher"
}
```

Structure example:
```
this-is-my-custom-path/
  root-folder/
    info.mtte
    pack 1/
      asset1.jpg
      asset2.jpg
    pack 2/
      asset3.web
    ...
```

You need additional help for configuring this properly? Join us on [Moulinette Discord](https://discord.gg/xg3dcMQfP2)


## How to index assets provided by other modules?

A lot of existing modules provide assets (sounds, icons, etc.) that you may want to be searchable and usable in Moulinette.
In order to make those assets appear in moulinette, you can follow one of the two techniques below.

### Ask the creator of module to integrate with Moulinette

Modules can declare their assets during the startup such Moulinette will automatically consider them when indexing assets.
Make a request to the creator of the module with a reference to this documentation. In order to declare one or more packs of assets, 
a module simply needs to add the following snippet of code

```javascript
Hooks.once("ready", async function () {
  if(game.moulinette) {
    game.moulinette.sources.push({ type: "images", publisher: "Foundry VTT", pack: "PF1 Icons", source: "data", path: "systems/pf1/icons" })
    ...
  }
});
```

* The if statement checks that moulinette module is available (installed and enabled).
* A module can define as many packs as desired
* `type` can have the value "images", "tokens" or "sounds"
* `publisher` is the name of the creator that is displayed in the dropdown list in moulinette
* `pack` is the name of the pack that is displayed in the dropdown list in moulinette
* `source` can have the value "data" (where modules are installed) or "public" (where FVTT is installed)
* `path` is the relative path to the assets according to the defined source. Assets don't have to be directly in that folder (Moulinette scans subfolders, too). Use the FilePicker to navigate and find the right path.

### Create a macro to define the assets BEFORE indexing

If you can't wait for the creators of the modules to define their assets, you can do it for yourself.
Normally, each module would define their assets as pack during the startup. You can simulate this by creating a macro that will declare packs. 

```javascript
Hooks.once("ready", async function () {
  if(game.moulinette) {
    game.moulinette.sources.push({ type: "images", publisher: "Foundry VTT", pack: "PF1 Icons", source: "data", path: "systems/pf1/icons" })
    game.moulinette.sources.push({ type: "sounds", publisher: "Michael Ghelfi", pack: "Ambience", source: "data", path: "modules/michaelghelfi/ambience" })
    game.moulinette.sources.push({ type: "sounds", publisher: "Michael Ghelfi", pack: "Music", source: "data", path: "modules/michaelghelfi/music" })
    ...
    ui.notifications.info("Sources added!");
  }
});
```

* This does exactly the same as a module could do during the startup phase (`ready`). See above for a better understanding of each field.
* You only need to execute that macro once before you index your assets with Moulinette. After that, you don't need the macro any more (unless you want to re-index)
* Don't execute the macro several times or you'll end up with duplicates after indexing the assets
