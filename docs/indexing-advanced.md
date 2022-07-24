
# Use advanced configuration (NOT RECOMMENDED)

![Warning](img/warning.png)

*This configuration is tech-savvy and should be avoided. Moulinette now supports adding sources (ie folders) to be indexed. This is much easier to use.*

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
