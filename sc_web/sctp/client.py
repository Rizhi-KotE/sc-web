# -*- coding: utf-8 -*-
"""
-----------------------------------------------------------------------------
This source file is part of OSTIS (Open Semantic Technology for Intelligent Systems)
For the latest info, see http://www.ostis.net

Copyright (c) 2012 OSTIS

OSTIS is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

OSTIS is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with OSTIS. If not, see <http://www.gnu.org/licenses/>.
-----------------------------------------------------------------------------
"""

import os, sys
import socket, struct

from types import sctpCommandType, sctpResultCode
from sctp.types import ScAddr



class sctpClient:
	
	def __init__(self):
		self.sock = None

	def initialize(self, host, port):
		"""Initialize network session with server
		@param host: Name of server host (str)
		@param port: connection listening port (int)  
		"""
		self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		self.sock.connect((host, port))
	
	def shutdown(self):
		"""Close network session
		"""
		pass
	
	def get_link_content(self, link_addr):
		"""Get content of sc-link with specified sc-addr
		@param link_addr: sc-addr of sc-link to get content
		@return: If data was returned without any errors, then return it;
		otherwise return None    
		"""
		
		# send request
		params = struct.pack('=HH', link_addr.seg, link_addr.offset)
		data = struct.pack('=BBII', sctpCommandType.SCTP_CMD_GET_LINK_CONTENT, 0, 0, len(params))
		alldata = data + params
		
		self.sock.send(alldata)
		
		# recieve response
		data = self.sock.recv(10)
		cmdCode, cmdId, resCode, resSize = struct.unpack('=BIBI', data)
		
		if resCode != sctpResultCode.SCTP_RESULT_OK:
			return None
		
		content_data = None
		if resSize > 0:
			content_data = self.sock.recv(resSize) 
		
		return content_data

	def check_element(self, el_addr):
		"""Check if sc-element with specified sc-addr exist
		@param el_addr: sc-addr of element to check
		@return: If specified sc-element exist, then return True; otherwise return False 
		"""
		
		# send request
		params = struct.pack('=HH', el_addr.seg, el_addr.offset)
		data = struct.pack('=BBII', sctpCommandType.SCTP_CMD_CHECK_ELEMENT, 0, 0, len(params))
		alldata = data + params
		
		self.sock.send(alldata)
		
		# recieve response
		data = self.sock.recv(10)
		cmdCode, cmdId, resCode, resSize = struct.unpack('=BIBI', data)
		
		return resCode == sctpResultCode.SCTP_RESULT_OK
	
	def get_element_type(self, el_addr):
		"""Returns type of specified sc-element
		@param el_addr:	sc-addr of element to get type
		@return: If type got without any errors, then return it; otherwise return None 
		"""
		
		# send request
		params = struct.pack('=HH', el_addr.seg, el_addr.offset)
		data = struct.pack('=BBII', sctpCommandType.SCTP_CMD_GET_ELEMENT_TYPE, 0, 0, len(params))
		alldata = data + params
		
		self.sock.send(alldata)
		
		# recieve response
		data = self.sock.recv(10)
		cmdCode, cmdId, resCode, resSize = struct.unpack('=BIBI', data)
		if resCode != sctpResultCode.SCTP_RESULT_OK:
			return None
		
		data = self.sock.recv(2)
		elType = struct.unpack("=H", data)[0]
		
		return elType
	
	def create_node(self, el_type):
		"""Create new sc-node in memory with specified type
		@param el_type:	Type of node that would be created
		@return: If sc-node was created, then returns it sc-addr; otherwise return None 
		"""
		
		# send request
		params = struct.pack('=H', el_type)
		data = struct.pack('=BBII', sctpCommandType.SCTP_CMD_GET_ELEMENT_TYPE, 0, 0, len(params))
		alldata = data + params
		
		self.sock.send(alldata)
		
		# recieve response
		data = self.sock.recv(10)
		cmdCode, cmdId, resCode, resSize = struct.unpack('=BIBI', data)
		if resCode != sctpResultCode.SCTP_RESULT_OK:
			return None
		
		addr = ScAddr()
		data = self.sock.recv(4)
		addr.seg, addr.offset = struct.unpack('=HH', data)
		
		return addr
	
	def create_link(self):
		"""Create new sc-link in memory
		@return: If sc-link was created, then returns it sc-addr; otherwise return None 
		"""
		# send request
		data = struct.pack('=BBII', sctpCommandType.SCTP_CMD_GET_ELEMENT_TYPE, 0, 0, 0)
		alldata = data
		
		self.sock.send(alldata)
		
		# recieve response
		data = self.sock.recv(10)
		cmdCode, cmdId, resCode, resSize = struct.unpack('=BIBI', data)
		if resCode != sctpResultCode.SCTP_RESULT_OK:
			return None
		
		addr = ScAddr()
		data = self.sock.recv(4)
		addr.seg, addr.offset = struct.unpack('=HH', data)
		
		return addr
	
	def create_arc(self, arc_type, begin_addr, end_addr):
		"""Create new arc in sc-memory with specified type and begin, end elements
		@param arc_type: Type of sc-arc
		@param begin_addr: sc-addr of begin arc element
		@param end_addr: sc-addr of end arc element
		@return: If sc-arc was created, then returns it sc-addr; otherwise return None 
		"""
		# send request
		params = struct.pack('=HHHHH', arc_type, begin_addr.seg, begin_addr.offset, end_addr.seg, end_addr.offset)
		data = struct.pack('=BBII', sctpCommandType.SCTP_CMD_GET_ELEMENT_TYPE, 0, 0, len(params))
		alldata = data + params
		
		self.sock.send(alldata)
		
		# recieve response
		data = self.sock.recv(10)
		cmdCode, cmdId, resCode, resSize = struct.unpack('=BIBI', data)
		if resCode != sctpResultCode.SCTP_RESULT_OK:
			return None
		
		addr = ScAddr()
		data = self.sock.recv(4)
		addr.seg, addr.offset = struct.unpack('=HH', data)
		
		return addr