import pprint

from slicer_cli_web import ctk_cli_adjustment  # noqa - imported for side effects
from ctk_cli import CLIArgumentParser

import os

import logging
logging.basicConfig(level=logging.INFO)


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

    

    pprint.pprint(vars(args), width=1000)
    with open(args.returnParameterFile, 'w') as f:
        f.write('>> parsed arguments\n')
        f.write('%r\n' % args)
    with open(args.arg1, 'w') as f:
        f.write('example\n')


if __name__ == '__main__':
    main(CLIArgumentParser().parse_args())
