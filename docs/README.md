# Moulinette Documentation

Most screenshots on the [Home page](..) are self-explanatory. 
This page provides additional details as a FAQ.

## How can I install Moulinette?

See [Install the module](../#install)

## How can I open Moulinette's interface from the game?

See [Open Moulinette interface](../#openUI)

## I already have assets in Foundry. Can I reuse them without having to move them into /moulinette folder?

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

Now, when you index assets (images or sounds), Moulinette will also scan the configured folder and list the assets with unknown publisher and unknow pack. If you want to classify them and make Moulinette list them better. You need to add simple config files.

If you want to specify 1 publisher and have all assets in 1 single pack, create a file with extension `.mtte` at the root of your folder(s) and provide following content
```
{
  "publisher": "My custom publisher",
  "pack": "My custom pack"
}
```

If you want to specify 1 publisher and let Moulinette create a pack for each subfolder, create a file with extension `.mtte` at the root of your folder(s) and provide following content
```
{
  "publisher": "My custom publisher"
}
```

You need additional help for configuring this properly? Join us on [Moulinette Discord](https://discord.gg/xg3dcMQfP2)
