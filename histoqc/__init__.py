from girder import plugin
from girder.api import access
from girder.api.rest import boundHandler, getApiUrl
from girder.api.describe import Description, autoDescribeRoute
from girder.models.folder import Folder
from girder.models.upload import Upload
from girder.models.item import Item
from girder_jobs.constants import JobStatus
from girder_jobs.models.job import Job
from bson import ObjectId
import requests
import os
import subprocess
import traceback
import tempfile
from glob import glob


histoqc_output_folder_name = 'histoqc-output-folder'


class GirderPlugin(plugin.GirderPlugin):
    DISPLAY_NAME = 'histoqc'
    CLIENT_SOURCE_PATH = 'web_client'
    def load(self, info):
        apiRoot = info['apiRoot']
        apiRoot.folder.route('POST', (':id', 'histoqc'), generateHistoQCHandler)
        apiRoot.folder.route('GET', (':id', 'histoqc'), getHistoQCResultsHandler)


@access.public
@boundHandler
@autoDescribeRoute(
    Description('Run HistoQC on every image in the folder.')
)
def generateHistoQCHandler(self, id, params):
    print(f"Starting histoqc job...")

    print(f'id = {id}')
    if id == '{id}': id = '63123b602acbb2914c9fd9c1'

    jobKwargs = {
        'folder': id,
        'apiroot': getApiUrl(),
        'headers': getHeaders(self),
        'user': self.getCurrentUser()
    }

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


def getItemsInFolder(folder_id):
    folder = Folder().findOne({'_id': ObjectId(folder_id)})
    items = [item for item in Folder().childItems(folder)]
    return items


def downloadItems(job, apiUrl, headers, items, directory):
    for item in items:
        job = Job().updateJob(job, log=f'item = {item}')
        try:
            url = apiUrl + '/item/' + str(item['_id']) + '/download'
            job = Job().updateJob(job, log=f'url = {url}')

            basename = os.path.basename(item['name'])
            job = Job().updateJob(job, log=f'basename = {basename}')

            tmp_image_path = os.path.join(directory, basename)
            job = Job().updateJob(job, log=f'Downloading item to {tmp_image_path}...')

            r = requests.get(url, headers=headers)
            open(tmp_image_path, 'wb').write(r.content)
            job = Job().updateJob(job, log=f'Downloaded item. File size = {os.path.getsize(tmp_image_path)}')

        except BaseException as e:
            job = Job().updateJob(job, log='Skipping image. ' + str(repr(e)) + ' ' + traceback.format_exc())


def getHistoQCOutputsFromImageID(image_id, folder_id):
    return [h for h in Item().find({
        'folderId': ObjectId(folder_id),
        'isHistoQC': True,
        'histoqcSource': ObjectId(image_id)
    })]


def histoqcJob(job):

    print('Started histoqc job.')
    print(f'job = {job}')
    apiUrl = job['kwargs']['apiroot']
    print(f'apiUrl = {apiUrl}')
    headers = job['kwargs']['headers']
    user = job['kwargs']['user']

    job = Job().updateJob(job,
        log='Started histoqc job.',
        status=JobStatus.RUNNING)

    try:
        output_folder = getHistoqcOutputFolder(user, headers)

        cwd = os.getcwd()

        # should probably not hard code this...
        histoqc_algo_path = os.path.join('/opt', 'histoqc', 'histoqcalgo')

        job = Job().updateJob(job, log=f'histoqc_algo_path = {histoqc_algo_path}')
        os.chdir(histoqc_algo_path)
        main_path = './histoqc/__main__.py'
        if not os.path.isfile(main_path):
            raise ValueError(f'Unable to find {main_path}. Did you check out the histoqc submodule?')

        folder_id = job['kwargs']['folder']
        items = getItemsInFolder(folder_id)
        job = Job().updateJob(job, log=f'Found {len(items)} items in folder {folder_id}')

        with tempfile.TemporaryDirectory() as tmp_output_dir:
            job = Job().updateJob(job, log=f'tmp_output_dir = {tmp_output_dir}')

            with tempfile.TemporaryDirectory() as tmp_input_dir:
                job = Job().updateJob(job, log=f'Downloading items from folder into directory {tmp_input_dir}')
                downloadItems(job, apiUrl, headers, items, tmp_input_dir)
                job = Job().updateJob(job, log='Downloaded items.')
                job = Job().updateJob(job, log='Started running histoqc on images. This may take a while.')
                histoqc_output = subprocess.check_output(["python", "-m", "histoqc",
                        '-o', tmp_output_dir,
                        f'{tmp_input_dir}/*'])

            job = Job().updateJob(job, log='HistoQC finished running. Collecting output.')

            for source_item in items:
                output_subdir = os.path.join(tmp_output_dir, source_item['name'])
                job = Job().updateJob(job, log=f'output_subdir = {output_subdir}')

                if not os.path.isdir(output_subdir) or not len(os.listdir(output_subdir)):
                    job = Job().updateJob(job, log=f'No output detected. Skipping.')
                    continue

                old_histoqc_outputs = getHistoQCOutputsFromImageID(source_item['_id'], output_folder['_id'])
                job = Job().updateJob(job, log=f'old_histoqc_outputs = {old_histoqc_outputs}')
                for old_histoqc_output in old_histoqc_outputs:
                    url = apiUrl + '/item/' + str(old_histoqc_output['_id'])
                    requests.delete(url, headers=headers)
                    job = Job().updateJob(job, log=f'Deleted {old_histoqc_output}')

                for filePath in glob(output_subdir + "/*.png"):
                    histoqc_output_name = os.path.basename(filePath)
                    job = Job().updateJob(job, log=f'histoqc_output_name = {histoqc_output_name}')

                    job = Job().updateJob(job, log=f'Uploading...')
                    file = Upload().uploadFromFile(
                        open(filePath, 'rb'), os.path.getsize(filePath),
                        name = histoqc_output_name,
                        parentType = 'folder',
                        parent = output_folder,
                        user = user
                    )
                    job = Job().updateJob(job, log=f'Uploaded. file = {file}')

                    item = Item().load(file['itemId'], user=user)
                    job = Job().updateJob(job, log=f'item = {file}')

                    histoqc_type = histoqc_output_name.split('.')[1][4:]
                    job = Job().updateJob(job, log=f'histoqc_type = {histoqc_type}')

                    item.update({
                        'isHistoQC': True,
                        'histoqcSource': ObjectId(source_item['_id']),
                        'histoqcType': histoqc_type
                    })
                    item = Item().updateItem(item)
                    job = Job().updateJob(job, log=f'item = {item}')

                    job = Job().updateJob(job, log=f'Generating thumbnail...')
                    url = apiUrl + '/item/' + str(item['_id']) + '/tiles'
                    job = Job().updateJob(job, log=f'url = {url}')
                    response = requests.post(url, headers=headers)
                    job = Job().updateJob(job, log=f'Generated thumbnail. Item finished uploading.')

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
    output_folder = getHistoqcOutputFolder(self.getCurrentUser(), getHeaders(self))
    print(f'output_folder = {output_folder}')

    if id == '{id}': id = '63123b602acbb2914c9fd9c1'
    current_folder = Folder().findOne({'_id': ObjectId(id)})
    print(f'current_folder = {current_folder}')

    final_output = []
    for item in Folder().childItems(current_folder):
        item_obj = Item().find({
            '_id': ObjectId(item['_id']),
        })
        print(f'item_obj = {item_obj}')

        histoqc_outputs = getHistoQCOutputsFromImageID(item['_id'], current_folder['_id'])
        print(f'histoqc_outputs = {histoqc_outputs}')
        final_output.append({'source_image': item, 'histoqc_outputs': histoqc_outputs})

    return final_output


def getHeaders(self):
    return {
        'Content-type': 'application/json',
        'Accept': 'application/json',
        'Girder-Token': self.getCurrentToken()['_id']
    }


# or make it if it does not yet exist
def getHistoqcOutputFolder(user, headers):
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

        response = requests.post(url, params=data, headers=headers)
        print(f'response = {response}')

        found_folder = Folder().findOne({'name': histoqc_output_folder_name})

    print(f'found_folder = {found_folder}')
    return found_folder
    

