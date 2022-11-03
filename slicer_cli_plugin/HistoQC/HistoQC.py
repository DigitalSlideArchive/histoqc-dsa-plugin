from slicer_cli_web import ctk_cli_adjustment  # noqa - imported for side effects
from ctk_cli import CLIArgumentParser
import girder_client

import os
import tempfile
import logging
import subprocess

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s.%(msecs)03d %(levelname)s %(module)s - %(funcName)s: %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')


def get_histoqc_output_folder(input_folder, girder, token):
    output_folder_name = 'histoqc_outputs'

    existing_folder = next(girder.listFolder(
        parentId = input_folder['id'],
        parentFolderType = 'folder',
        name = output_folder_name, limit=1), None)

    if existing_folder:
        existing_id = existing_folder['_id']
        logging.warning(f'Folder {output_folder_name} already exists with id {existing_id}. Trying to delete first.')
        # girder.sendRestRequest(
        #     'DELETE',
        #     f'folder/{existing_id}',
        #     headers = {'Girder-Token': token})

        # this above code does not seem to work with the sendRestRequest. It errors with:
        """
        File "HistoQC/HistoQC.py", line 26, in get_histoqc_output_folder
            girder.sendRestRequest(
        File "/usr/local/lib/python3.8/dist-packages/girder_client/__init__.py", line 463, in sendRestRequest
            raise HttpError(
        girder_client.HttpError: HTTP error 401: DELETE http://girder:8080/api/v1/folder/63634338159f05a390e16adf
        Response text: {"message": "You must be logged in.", "type": "access"}
        """
        # instead, we'll just use an existing folder (which is problematic because we're potentially keeping stale outputs from previous runs)

    #return girder.createFolder(
    return girder.loadOrCreateFolder(
    #    name = output_folder_name,
        folderName = output_folder_name,
        parentId = input_folder['id'],
        parentType = 'folder')


def upload_histoqc_outputs(input_folder, output_dir, girder, token):

    output_folder = get_histoqc_output_folder(input_folder, girder, token)
    logging.info(f'output_folder = {output_folder}')

    girder.upload(
        filePattern = f'{output_dir}/*',
        parentId = output_folder['_id'],
        parentType = 'folder')


def run_histoqc(input_folder, girder, token):
    # we will remember which directory we're currently in and only temporarily move into the histoqc directory for running it
    # TODO: parameterize this so it knows where histoqc is located from the DockerFile
    histoqc_dir = '/opt/HistoQC' # from https://github.com/Theta-Tech-AI/histoqc-dsa-plugin/blob/13a82ab5bb42ca09104d887c1e6e6cff3a839ced/slicer_cli_plugin/Dockerfile#L24
    current_dir = os.getcwd()
    input_dir = input_folder['local_path']

    with tempfile.TemporaryDirectory() as tmp_output_dir:
    
        logging.info('HistoQC starting running.')
        os.chdir(histoqc_dir)
        histoqc_output = subprocess.check_output(
            ["python3", "-m", "histoqc",
                '-o', tmp_output_dir,
                f'{input_dir}/*'])
        os.chdir(current_dir)
        logging.info('HistoQC finished running.')

        logging.info(f'Output = {os.listdir(tmp_output_dir)}')
        upload_histoqc_outputs(input_folder, tmp_output_dir, girder, token)


def get_folder(args, girder):

    input_dir = args.inputDir
    logging.info(f'input_dir = {input_dir}')

    # by convention, it appears that the folder id is name of the parent directory - there is probably a better way to directly pass that in from the slicer cli
    folder_id = os.path.basename(os.path.dirname(input_dir))
    logging.info(f'folder_id = {folder_id}')

    return {
        'local_path': input_dir,
        'id': folder_id
        }


def get_girder_client(args):
    gc = girder_client.GirderClient(apiUrl=args.girderApiUrl)
    token = args.girderToken
    gc.setToken(token)
    return gc, token


def main(args):
    logging.info('Entering main function')
    logging.info('args = %r' % args)

    girder, token = get_girder_client(args)
    
    folder = get_folder(args, girder)
    logging.info(f'folder = {folder}')

    run_histoqc(folder, girder, token)
    

if __name__ == '__main__':
    main(CLIArgumentParser().parse_args())
