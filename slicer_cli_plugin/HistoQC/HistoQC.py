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


def get_histoqc_output_folder(input_folder, girder):
    parent_folder_id = input_folder['id']
    logging.info(f'parent_folder_id = {parent_folder_id}')
    return girder.loadOrCreateFolder('histoqc_outputs', parentId=parent_folder_id, parentType='folder')


def upload_histoqc_outputs(input_folder, output_dir, girder):

    output_folder = get_histoqc_output_folder(input_folder, girder)
    logging.info(f'output_folder = {output_folder}')

    for input_item_name, input_item_id in input_folder['items'].items():
        output_subdir = os.path.join(output_dir, input_item_name)
        logging.info(f'Items in {output_subdir} = {os.listdir(output_subdir)}')

    raise Exception('Not yet implemented.')



def run_histoqc(input_folder, girder):
    # we will remember which directory we're currently in and only temporarily move into the histoqc directory for running it
    # TODO: parameterize this so it knows where histoqc is located from the DockerFile
    histoqc_dir = '/opt/HistoQC' # from https://github.com/Theta-Tech-AI/histoqc-dsa-plugin/blob/13a82ab5bb42ca09104d887c1e6e6cff3a839ced/slicer_cli_plugin/Dockerfile#L24
    current_dir = os.getcwd()
    input_dir = input_folder['local_path']

    with tempfile.TemporaryDirectory() as tmp_output_dir:
    
        logging.info('Running HistoQC on all files. Please wait, this may take a few minutes...')
        os.chdir(histoqc_dir)
        histoqc_output = subprocess.check_output(
            ["python3", "-m", "histoqc",
                '-o', tmp_output_dir,
                f'{input_dir}/*'])
        os.chdir(current_dir)
        logging.info('HistoQC finished running.')

        logging.info(f'Output = {os.listdir(tmp_output_dir)}')
        upload_histoqc_outputs(input_folder, tmp_output_dir, girder)


def get_folder(args, girder):

    input_dir = args.inputDir
    logging.info(f'input_dir = {input_dir}')

    # by convention, it appears that the folder id is name of the parent directory - there is probably a better way to directly pass that in from the slicer cli
    folder_id = os.path.basename(os.path.dirname(input_dir))
    logging.info(f'folder_id = {folder_id}')

    filenames = os.listdir(input_dir)
    logging.info(f'filenames = {filenames}')

    item_ids = {}
    for filename in filenames:
        logging.info(f'filename = {filename}')
        try:
            item = next(girder.listItem(folder_id, name=filename, limit=1))
        except StopIteration:
            logging.warning(f'No item found for name {filename}. Skipping.')
            continue
        logging.info(f'item = {item}')
        item_id = item['_id']
        item_ids[filename] = item_id
    
    return {
        'local_path': input_dir,
        'id': folder_id,
        'items': item_ids
        }


def get_girder_client(args):
    gc = girder_client.GirderClient(apiUrl=args.girderApiUrl)
    gc.setToken(args.girderToken)
    return gc


def main(args):
    logging.info('Entering main function')
    logging.info('args = %r' % args)

    girder = get_girder_client(args)
    
    folder = get_folder(args, girder)
    logging.info(f'folder = {folder}')

    run_histoqc(folder, girder)
    

if __name__ == '__main__':
    main(CLIArgumentParser().parse_args())
