from girder import plugin
from girder.api import access
from girder.api.rest import boundHandler, getApiUrl
from girder.api.describe import Description, autoDescribeRoute
from girder.models.folder import Folder
from girder_jobs.constants import JobStatus
from girder_jobs.models.job import Job

import requests
import os
import subprocess
import traceback


histoqc_output_folder_name = 'histoqc-output-folder'


class GirderPlugin(plugin.GirderPlugin):
    DISPLAY_NAME = 'histoqc'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):

        apiRoot = info['apiRoot']

        apiRoot.folder.route('POST', (':id', 'histoqc'), generateHistoQCHandler)
        apiRoot.folder.route('GET', (':id', 'histoqc-results'), getHistoQCResultsHandler)
        #info['apiRoot'].item.route('PUT', (':id', 'histoqc-upload'), uploadHandler)
        #info['apiRoot'].item.route('GET', (':id', 'thumbnail-rest'), restRequest)


@access.public
@boundHandler
@autoDescribeRoute(
    Description('Run HistoQC on every image in the folder.')
)
def generateHistoQCHandler(self, id, params):
    print(f"Starting histoqc job...")

    print(f'id = {id}')
    jobKwargs = {'folder': id}
    job = Job().createLocalJob(
        module='histoqc',
        function='histoqcJob',
        kwargs=jobKwargs,
        title='HistoQC Job',
        type='histoqc_job_type',
        user=self.getCurrentUser(),
        public=True,
        asynchronous=True,
    )
    print(f'job = {job}')
    Job().scheduleJob(job)
    print('HistoQC job scheduled.')
    return job


def histoqcJob(job):

    print('Started histoqc job.')
    print(f'job = {job}')

    job = Job().updateJob(job,
        log='Started histoqc job.',
        status=JobStatus.RUNNING)

    try:
        cwd = os.getcwd()
        histoqc_algo_path = os.path.join('..', 'histoqc', 'histoqcalgo')
        job = Job().updateJob(job,log=f'histoqc_algo_path = {histoqc_algo_path}')
        os.chdir(histoqc_algo_path)

        main_path = './histoqc/__main__.py'
        if not os.path.isfile(main_path):
            raise ValueError(f'Unable to find {main_path}. Did you check out the histoqc submodule?')

        job = Job().updateJob(job,log='Started running histoqc on images. This may take a while.')
        histoqc_output = subprocess.check_output(["python", "-m", "histoqc", "*.svs"])

        job = Job().updateJob(job,log='HistoQC finished running. Collecting output.')

        job = Job().updateJob(job,
            log='HistoQC job finished.',
            status=JobStatus.SUCCESS)

        os.chdir(cwd)
        
    except Exception as e:
        Job().updateJob(job,
            log=str(repr(e)) + ' ' + traceback.format_exc(),
            status=JobStatus.ERROR)


@access.public
@boundHandler
@autoDescribeRoute(
    Description('Retrieve HistoQC results for every image in the folder')
)
def getHistoQCResultsHandler(self, id, params):
    print(f"Getting histo qc results.")

    print('Getting histoqc output folder...')
    output_folder = getHistoqcOutputFolder(self)
    print(f'output_folder = {output_folder}')

    return {"hello": "world"}



def getHeaders(self):
    return {
        'Content-type': 'application/json',
        'Accept': 'application/json',
        'Girder-Token': self.getCurrentToken()['_id']
    }


# or make it if it does not yet exist
def getHistoqcOutputFolder(self):
    user = self.getCurrentUser()
    print(f'user = {user}')

    print(f'Searching for output folder {histoqc_output_folder_name}...')
    found_folder = Folder().findOne({'name': histoqc_output_folder_name})

    if not found_folder:
        print('Folder not found. Creating it.')

        url = getApiUrl() + '/folder'
        print(f'url = {url}')

        data = {
            'parentType': "user",
            'parentId': str(user['_id']),
            'name': histoqc_output_folder_name,
            'reuseExisting': True,
            'public': False
        }
        print(f'data = {data}')

        # can probably do this with a call directly to Folder()...

        response = requests.post(url, params=data, headers=get_headers(self))
        print(f'response = {response}')

        found_folder = Folder().findOne({'name': histoqc_output_folder_name})

    print(f'found_folder = {found_folder}')
    return found_folder
    