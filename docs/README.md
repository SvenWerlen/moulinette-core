# Moulinette Documentation

Most screenshots on the [Home page](..) are self-explanatory. 
This page provides additional details as a FAQ.

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
