import logging
import re
from datetime import datetime

import eth_abi
import pyarrow.parquet as pq
import requests
from cloudpathlib import AnyPath
from eth_utils import to_checksum_address
from fastapi import Depends
from hexbytes import HexBytes
from pyarrow import fs
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from . import crud, database, models, schemas


class Indexer:
    def __init__(self, subgraph_url, archived_reward_programs):
        self.subgraph_url = subgraph_url
        self.archived_reward_programs = archived_reward_programs

    def run(self, db: Session, storage_location):
        reward_program_ids = [o["id"] for o in self.get_reward_programs()]
        for reward_program_id in reward_program_ids:
            if reward_program_id not in self.archived_reward_programs:
                self.index_for_program(db, reward_program_id, storage_location)

    def index_for_program(self, db: Session, reward_program_id, storage_location):
        with db.begin():
            last_submitted_root_block_number = self.get_last_indexed_root_block_number(
                db, reward_program_id
            )
            logging.info(
                f"Indexing reward program {reward_program_id} since block {last_submitted_root_block_number}"
            )
            logging.info("===Start===")
            new_roots = self.get_merkle_roots(
                reward_program_id, last_submitted_root_block_number
            )
            if len(new_roots) > 0:
                for root in sorted(new_roots, key=lambda x: x["blockNumber"]):
                    file_name = (
                        storage_location
                        + f"/rewardProgramID={reward_program_id}/paymentCycle={root['paymentCycle']}/results.parquet"
                    )
                    s3_path = AnyPath(file_name)
                    if s3_path.exists():
                        payment_table = pq.read_table(s3_path)
                        payment_list = payment_table.to_pylist()
                        self.add_root_and_proofs(db, root, payment_list)
                    else:
                        logging.info(f"{file_name} does not exist within s3")
                db.commit()
            else:
                logging.info("Skipping indexing: No new roots")
            logging.info("===Done===")

    def add_root_and_proofs(self, db: Session, root, payment_list):
        logging.info(f"Indexing {len(payment_list)} proofs for root {root['id']}")
        root = models.Root(
            rootHash=root["id"],
            rewardProgramId=root["rewardProgram"]["id"],
            paymentCycle=root["paymentCycle"],
            blockNumber=root["blockNumber"],
            timestamp=datetime.fromtimestamp(int(root["timestamp"])),
        )
        db.add(root)
        proofs = []
        for payment in payment_list:
            token, amount = self.decode_payment(payment)
            i = models.Proof(
                rootHash=payment["root"],
                paymentCycle=payment["paymentCycle"],
                tokenAddress=to_checksum_address(token),
                payee=payment["payee"],
                proofArray=payment["proof"],
                rewardProgramId=payment["rewardProgramID"],
                amount=amount,
                leaf=payment["leaf"],
                validFrom=payment["validFrom"],
                validTo=payment["validTo"],
            )
            proofs.append(i)
        db.bulk_save_objects(proofs)

    def decode_payment(self, payment):
        _, _, _, _, token_type, _, transfer_data = eth_abi.decode_abi(
            ["address", "uint256", "uint256", "uint256", "uint256", "address", "bytes"],
            HexBytes(payment["leaf"]),
        )
        return eth_abi.decode_abi(["address", "uint256"], transfer_data)

    def get_last_indexed_root_block_number(self, db: Session, reward_program_id: str):
        o = (
            db.query(models.Root)
            .filter(models.Root.rewardProgramId == reward_program_id)
            .order_by(models.Root.blockNumber.desc())
            .first()
        )
        return o.blockNumber if o is not None else 0

    def get_merkle_roots(self, reward_program_id: str, block_number: int):
        query = """
        {
            merkleRootSubmissions(
                where: {
                    rewardProgram: "%s",
                    blockNumber_gt: %d
                },
                orderBy: blockNumber,
                orderDirection: asc
            ){
                id
                blockNumber
                paymentCycle
                rewardProgram {
                    id
                }
                timestamp
            }
        }
        """ % (
            reward_program_id,
            block_number,
        )
        return self.query_subgraph(query)["merkleRootSubmissions"]

    def get_reward_programs(self):
        query = """
        {
            rewardPrograms(
                orderBy: id, orderDirection: desc)
            {
                id
            }
        }
        """
        return self.query_subgraph(query)["rewardPrograms"]

    def query_subgraph(self, query):
        try:
            r = requests.post(
                self.subgraph_url,
                json={"query": query},
            )
            if r.ok:
                json_data = r.json()
                return json_data["data"]
            else:
                raise (r.raise_for_status())
        except requests.exceptions.ConnectionError:
            logging.warn("Connection error during query subgraph")
        except Exception as e:
            logging.warn("Error when querying subgraph")
            raise (e)