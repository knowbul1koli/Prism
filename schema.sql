-- Prism Panel Database Schema
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `forward` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `user_id` int(10) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `tunnel_id` int(10) NOT NULL,
  `in_port` int(10) NOT NULL,
  `out_port` int(10) DEFAULT NULL,
  `remote_addr` longtext NOT NULL,
  `strategy` varchar(100) NOT NULL DEFAULT 'fifo',
  `interface_name` varchar(200) DEFAULT NULL,
  `in_flow` bigint(20) NOT NULL DEFAULT '0',
  `out_flow` bigint(20) NOT NULL DEFAULT '0',
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) NOT NULL,
  `status` int(10) NOT NULL,
  `inx` int(10) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `node` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `secret` varchar(100) NOT NULL,
  `ip` longtext,
  `server_ip` varchar(100) NOT NULL,
  `port_sta` int(10) NOT NULL,
  `port_end` int(10) NOT NULL,
  `version` varchar(100) DEFAULT NULL,
  `http` int(10) NOT NULL DEFAULT '0',
  `tls` int(10) NOT NULL DEFAULT '0',
  `socks` int(10) NOT NULL DEFAULT '0',
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) DEFAULT NULL,
  `status` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `speed_limit` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `speed` int(10) NOT NULL,
  `tunnel_id` int(10) NOT NULL,
  `tunnel_name` varchar(100) NOT NULL,
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) DEFAULT NULL,
  `status` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `statistics_flow` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `user_id` int(10) NOT NULL,
  `flow` bigint(20) NOT NULL,
  `total_flow` bigint(20) NOT NULL,
  `time` varchar(100) NOT NULL,
  `created_time` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tunnel` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `traffic_ratio` decimal(10,1) NOT NULL DEFAULT '1.0',
  `in_node_id` int(10) NOT NULL,
  `in_ip` varchar(100) NOT NULL,
  `out_node_id` int(10) NOT NULL,
  `out_ip` varchar(100) NOT NULL,
  `type` int(10) NOT NULL,
  `protocol` varchar(10) NOT NULL DEFAULT 'tls',
  `flow` int(10) NOT NULL,
  `tcp_listen_addr` varchar(100) NOT NULL DEFAULT '0.0.0.0',
  `udp_listen_addr` varchar(100) NOT NULL DEFAULT '0.0.0.0',
  `interface_name` varchar(200) DEFAULT NULL,
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) NOT NULL,
  `status` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `user` varchar(100) NOT NULL,
  `pwd` varchar(100) NOT NULL,
  `role_id` int(10) NOT NULL,
  `exp_time` bigint(20) NOT NULL,
  `flow` bigint(20) NOT NULL,
  `in_flow` bigint(20) NOT NULL DEFAULT '0',
  `out_flow` bigint(20) NOT NULL DEFAULT '0',
  `flow_reset_time` bigint(20) NOT NULL,
  `num` int(10) NOT NULL,
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) DEFAULT NULL,
  `status` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_tunnel` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `user_id` int(10) NOT NULL,
  `tunnel_id` int(10) NOT NULL,
  `speed_id` int(10) DEFAULT NULL,
  `num` int(10) NOT NULL,
  `flow` bigint(20) NOT NULL,
  `in_flow` bigint(20) NOT NULL DEFAULT '0',
  `out_flow` bigint(20) NOT NULL DEFAULT '0',
  `flow_reset_time` bigint(20) NOT NULL,
  `exp_time` bigint(20) NOT NULL,
  `status` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `vite_config` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `value` longtext NOT NULL,
  `time` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
