import pprint

from slicer_cli_web import ctk_cli_adjustment  # noqa - imported for side effects
from ctk_cli import CLIArgumentParser

import os

import logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s.%(msecs)03d %(levelname)s %(module)s - %(funcName)s: %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

# TODO: parameterize this so it knows where histoqc is located from the DockerFile
histoqc_dir = '/opt/HistoQC' # from https://github.com/Theta-Tech-AI/histoqc-dsa-plugin/blob/13a82ab5bb42ca09104d887c1e6e6cff3a839ced/slicer_cli_plugin/Dockerfile#L24
histoqc_module_subdir = 'histoqc'


def get_item(args):
    image_path = os.path.abspath(args.input_image)
    logging.info(f'image_path = {image_path}')
    logging.info(f'image exists = {os.path.isfile(image_path)}')

    subdir = os.path.basename(os.path.dirname(image_path))
    item_id = subdir
    logging.info(f'item_id = {item_id}')
    return {'image_path': image_path, 'item_id': item_id}



def main(args):
    logging.info('Entering main function')
    logging.info('args = %r' % args)

    item = get_item(args)
    logging.info(f'item = {item}')

    logging.info(f'Files in {histoqc_dir} = {os.listdir(os.path.join(histoqc_dir,histoqc_module_subdir))}')
    

if __name__ == '__main__':
    main(CLIArgumentParser().parse_args())
