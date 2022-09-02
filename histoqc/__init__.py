from girder import plugin
from girder.api import access
from girder.api.rest import boundHandler, getApiUrl
from girder.api.describe import Description, autoDescribeRoute
from girder.models.folder import Folder
import requests


histoqc_output_folder_name = 'histoqc-output-folder'


class GirderPlugin(plugin.GirderPlugin):
    DISPLAY_NAME = 'histoqc'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):

        apiRoot = info['apiRoot']
        
        apiRoot.folder.route('GET', (':id', 'histoqc-results'), getHistoQCResultsHandler)
        #info['apiRoot'].item.route('PUT', (':id', 'histoqc-upload'), uploadHandler)
        #info['apiRoot'].item.route('GET', (':id', 'thumbnail-rest'), restRequest)


@access.public
@boundHandler
@autoDescribeRoute(
    Description('Retrieve HistoQC results for every image in the folder')
)
def getHistoQCResultsHandler(self, id, params):
    print(f"Getting histo qc results.")

    print('Getting histoqc output folder...')
    output_folder = getHistoqcOutputFolder(self)
    print('output_folder = {output_folder}')

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

        response = requests.post(url, params=data, headers=get_headers(self))
        print(f'response = {response}')

        found_folder = Folder().findOne({'name': histoqc_output_folder_name})

    print(f'found_folder = {found_folder}')
    return found_folder
    