import pprint

from slicer_cli_web import ctk_cli_adjustment  # noqa - imported for side effects
from ctk_cli import CLIArgumentParser

import girder_client

import os

import logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s.%(msecs)03d %(levelname)s %(module)s - %(funcName)s: %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

# TODO: parameterize this so it knows where histoqc is located from the DockerFile
histoqc_dir = '/opt/HistoQC' # from https://github.com/Theta-Tech-AI/histoqc-dsa-plugin/blob/13a82ab5bb42ca09104d887c1e6e6cff3a839ced/slicer_cli_plugin/Dockerfile#L24
histoqc_module_subdir = 'histoqc'


# def getHistoqcOutputFolder(user):
#     return Folder().createFolder(
#         parent = user,
#         parentType='user',
#         name = histoqc_output_folder_name,
#         description='Folder to store the histoqc outputs for a user',
#         public = False,
#         reuseExisting = True) # reuseExisting will first search for an existing folder


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
        item = next(girder.listItem(folder_id, name=filename, limit=1))
        logging.info(f'item = {item}')
        item_id = item['_id']
        item_ids[filename] = item_id
    
    return {'input_dir': input_dir, 'item_ids': item_ids}


def get_girder_client(args):
    gc = girder_client.GirderClient(apiUrl=args.girderApiUrl)
    gc.setToken(args.girderToken)
    return gc


def main(args):
    logging.info('Entering main function')
    logging.info('args = %r' % args)

    logging.info(f'Files in {histoqc_dir} = {os.listdir(os.path.join(histoqc_dir,histoqc_module_subdir))}')

    girder = get_girder_client(args)
    
    folder = get_folder(args, girder)
    logging.info(f'folder = {folder}')

    

if __name__ == '__main__':
    main(CLIArgumentParser().parse_args())
