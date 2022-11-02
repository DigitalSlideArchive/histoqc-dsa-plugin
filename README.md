# histoqc-dsa-plugin

## Slicer CLI Integration
To run the histoqc in batch mode, go into the proper subdirectory and rebuild the image:

```bash
cd ~
git clone https://github.com/Theta-Tech-AI/histoqc-dsa-plugin
cd ~/histoqc-dsa-plugin/slicer_cli_plugin
docker image build -t histoqc:latest . && docker image ls | grep histoqc
```
