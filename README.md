# histoqc-dsa-plugin

## Slicer CLI Integration
To run the histoqc in batch mode, go into the proper subdirectory and rebuild the image:

```bash
cd ~
git clone https://github.com/Theta-Tech-AI/histoqc-dsa-plugin
cd ~/histoqc-dsa-plugin/slicer_cli_plugin
docker image build -t histoqc:latest . && docker image ls | grep histoqc
```

Then, assuming that DSA is running, go to the Slicer CLI plugin config:
![image](https://user-images.githubusercontent.com/34462353/199604503-8d2bbd8f-58cc-4d0e-a9ed-7540e91f5719.png)

Type in the tag of the image you just build above and click **Import Image**:
![image](https://user-images.githubusercontent.com/34462353/199604605-20cfde51-6735-46a6-a0ad-fcc5a013b7d2.png)

Then, navigate to an pathology image in the HistomicsUI view:
