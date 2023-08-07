FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get install -y git python3-pip python3 openslide-tools

RUN cd /opt && git clone https://github.com/choosehappy/HistoQC.git
RUN pip3 install --upgrade pip
RUN pip3 install -r /opt/HistoQC/requirements.txt
RUN pip3 install --pre girder-slicer-cli-web girder-client

COPY . $PWD


ENTRYPOINT ["python3", "./cli_list.py"]
