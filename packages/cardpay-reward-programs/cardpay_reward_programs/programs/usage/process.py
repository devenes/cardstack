"""
# Reward Usage

This is designed to reward users using any part of the cardpay network
"""

import re
from ..utils import get_files
import duckdb


class UsageRewardProgram:
    def __init__(self, config_location, reward_program_id: str, payment_cycle_length: int):
        self.config_location = config_location
        self.reward_program_id = reward_program_id
        self.payment_cycle_length = payment_cycle_length

    def set_parameters(
        self,
        token: str,
        base_reward: float,
        transaction_factor: float,
        spend_factor: float,
        valid_duration: int,
    ):
        self.token = token
        self.base_reward = base_reward
        self.transaction_factor = transaction_factor
        self.spend_factor = spend_factor
        self.valid_duration = valid_duration

    def _get_table_query(self, min_partition: int, max_partition: int):
        table = "prepaid_card_payment"
        local_files = get_files(
            self.config_location, table, min_partition, max_partition
        )
        return f"parquet_scan({local_files})"

    def run_query(self, table_query: str, min_partition: int, max_partition: int, payment_cycle: int):
        valid_from = max_partition
        valid_to = max_partition + self.valid_duration
        con = duckdb.connect(database=":memory:", read_only=False)
        sql = f"""
        select
        prepaid_card_owner as payee,

        (? * 
        1 + (1-(percent_rank() over (order by sum(spend_amount_uint64)  desc))) * (?)
        *
        1 + (1-(percent_rank() over (order by count(*)  desc))) * (?))::integer as amount,

        count(*) as transactions,
        sum(spend_amount_uint64) as total_spent,
        
        ? as "rewardProgramID",
        ?::integer as "paymentCycle",
        ? as token,
        ?::integer as "validFrom",
        ?::integer as "validTo"

        from {table_query}
        where block_number_uint64 >= ? and block_number_uint64 < ?
        group by prepaid_card_owner
        order by transactions desc
        """
        con.execute(
            sql,
            [
                self.base_reward,
                self.spend_factor,
                self.transaction_factor,
                self.reward_program_id,
                payment_cycle,
                self.token,
                valid_from,
                valid_to,
                min_partition,
                max_partition,
            ],
        )
        return con.fetchdf()

    def run(self, payment_cycle: int):
        min_block = payment_cycle - self.payment_cycle_length
        max_block = payment_cycle
        return self.run_query(
            self._get_table_query(min_block, max_block),
            min_block,
            max_block,
            payment_cycle,
        )