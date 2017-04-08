# -*- coding: utf-8 -*-

import graph_tool.all as gt
import pandas as pd


data_dir = "../data/"

node_file_in = "exp_node.psv"
link_file_in = "exp_link.psv"

node_file_out = "vis_node.csv"
link_file_out = "vis_link.csv"

G = gt.Graph(directed=False)
nodes = {}

print "Reading nodes"

df_nodes = pd.read_csv(data_dir + node_file_in, delimiter='|')
df_nodes.insert(0, 'index', None)
df_nodes.insert(1, 'fx', None)
df_nodes.insert(2, 'fy', None)

for index, row in df_nodes.iterrows():
    node_id = row['esco_oc_key']

    v = G.add_vertex()

    nodes[node_id] = v
    df_nodes.loc[index, 'index'] = v


print "Reading links"

df_links = pd.read_csv(data_dir + link_file_in, delimiter='|')
df_links.insert(0, 'source', None)
df_links.insert(1, 'target', None)

for index, row in df_links.iterrows():
    from_id = row['from_oc_key']
    to_id = row['to_oc_key']

    from_vert = nodes[from_id]
    to_vert = nodes[to_id]

    e = G.add_edge(from_vert, to_vert)

    df_links.loc[index, 'source'] = from_vert
    df_links.loc[index, 'target'] = to_vert


N = G.num_vertices()
L = G.num_edges()

print "Graph built - number of nodes and links: %d, %d" % (N, L)


print "Calculating layout"
pos = gt.sfdp_layout(G)


for index, row in df_nodes.iterrows():
    fx = pos[index][0]
    fy = pos[index][1]

    df_nodes.loc[index, 'fx'] = fx
    df_nodes.loc[index, 'fy'] = fy


print "Writing output CSV files"

df_nodes.to_csv(data_dir + node_file_out, sep='\t', encoding='utf-8', index=False)
df_links_out = df_links[['source', 'target']]
df_links_out.to_csv(data_dir + link_file_out, sep='\t', encoding='utf-8', index=False)


print "Done!"
